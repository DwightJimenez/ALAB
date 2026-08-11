const express = require("express");
const { Inventory, ItemInstance, MaterialRequest, User } = require("../models");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");
const { Op } = require("sequelize");

const router = express.Router();

router.get("/", verifyToken, async (req, res) => {
  try {
    const items = await Inventory.findAll({
      include: [
        {
          model: ItemInstance,
          as: "instances",
          attributes: [
            "id",
            "controlNumber",
            "condition",
            "expirationDate",
            "quantity",
          ],
          // ONLY fetch instances that are NOT "In Use"
          where: {
            condition: {
              [Op.ne]: "In Use",
            },
          },
          required: false, // Ensures the inventory item still appears even if 0 are available
        },
      ],
      order: [
        ["name", "ASC"],
        ["category", "ASC"],
      ],
    });

    // Dynamically calculate totalQuantity based ONLY on available instances
    const formattedItems = items.map((item) => {
      const jsonItem = item.toJSON();
      jsonItem.totalQuantity = jsonItem.instances.reduce(
        (sum, inst) => sum + (inst.quantity || 0),
        0
      );
      return jsonItem;
    });

    res.status(200).json(formattedItems);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch inventory." });
  }
});


router.get("/admin", verifyToken, requireAdmin, async (req, res) => {
  try {
    const items = await Inventory.findAll({
      include: [
        {
          model: ItemInstance,
          as: "instances",
          attributes: [
            "id",
            "controlNumber",
            "condition",
            "expirationDate",
            "quantity",
          ],
        },
      ],
      order: [
        ["name", "ASC"],
        ["category", "ASC"],
      ],
    });

    // Dynamically calculate totalQuantity for each inventory item
    const formattedItems = items.map((item) => {
      const jsonItem = item.toJSON();
      jsonItem.totalQuantity = jsonItem.instances.reduce(
        (sum, inst) => sum + (inst.quantity || 0),
        0,
      );
      return jsonItem;
    });

    res.status(200).json(formattedItems);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch inventory." });
  }
});


router.post("/batch", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, category, unit, imageUrl, instances } = req.body;

    if (!instances || instances.length === 0) {
      return res
        .status(400)
        .json({ error: "Must provide at least one control number instance." });
    }

    const newInventory = await Inventory.create({
      name,
      category,
      unit,
      imageUrl,
    });

    const formattedInstances = instances.map((inst) => ({
      ...inst,
      inventoryId: newInventory.id,
      quantity:
        category === "EQUIPMENT" ||
        category === "GLASSWARE" ||
        category === "CLEANING"
          ? 1
          : inst.quantity || 0,
    }));

    await ItemInstance.bulkCreate(formattedInstances, { validate: true });

    res
      .status(201)
      .json({ message: "Inventory and instances added successfully!" });
  } catch (error) {
    console.error("Insert failed:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        error: "One or more Control Numbers already exist in the database.",
      });
    }
    res.status(500).json({ error: "Failed to process inventory addition." });
  }
});

router.post("/request", verifyToken, async (req, res) => {
  try {
    const { inventoryId, amountRequested } = req.body;
    const studentId = req.user.id;

    // Fetch instances that are NOT "In Use" to know the true available quantity
    const item = await Inventory.findByPk(inventoryId, {
      include: [
        {
          model: ItemInstance,
          as: "instances",
          where: { condition: { [Op.ne]: "In Use" } },
          required: false,
        },
      ],
    });

    if (!item) return res.status(404).json({ error: "Item not found." });

    const currentStock = item.instances.reduce(
      (sum, i) => sum + (i.quantity || 0),
      0
    );

    if (currentStock < amountRequested) {
      return res.status(400).json({ error: "Insufficient stock available." });
    }

    const request = await MaterialRequest.create({
      inventoryId,
      studentId,
      amountRequested,
      status: "PENDING",
    });

    res.status(201).json({ message: "Request sent successfully", request });
  } catch (error) {
    res.status(500).json({ error: "Failed to create request." });
  }
});

router.get("/requests/pending", verifyToken, requireAdmin, async (req, res) => {
  try {
    const requests = await MaterialRequest.findAll({
      where: { status: "PENDING" },
      include: [User, Inventory],
    });
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch requests." });
  }
});

router.put(
  "/requests/:id/approve",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { controlNumber } = req.body;
      const request = await MaterialRequest.findByPk(req.params.id);
      if (!request)
        return res.status(404).json({ error: "Request not found." });

      const instance = await ItemInstance.findOne({ where: { controlNumber } });
      if (!instance)
        return res.status(404).json({ error: "Control number not found." });

      instance.quantity -= request.amountRequested;
      if (instance.quantity < 0) instance.quantity = 0;
      await instance.save();

      request.status = "APPROVED";
      request.assignedCN = controlNumber;
      await request.save();

      res.status(200).json({ message: "Approved and CN assigned." });
    } catch (error) {
      res.status(500).json({ error: "Failed to approve request." });
    }
  }
);

router.get("/catalog", verifyToken, async (req, res) => {
  try {
    const items = await Inventory.findAll({
      include: [
        {
          model: ItemInstance,
          as: "instances",
          attributes: ["quantity"],
          // ONLY fetch instances that are NOT "In Use"
          where: {
            condition: {
              [Op.ne]: "In Use",
            },
          },
          required: false,
        },
      ],
    });

    const catalogList = items.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      unit: item.unit,
      imageUrl: item.imageUrl,
      // Dynamic total calculation for the catalog view (only counts available)
      totalQuantity: item.instances.reduce(
        (sum, inst) => sum + (inst.quantity || 0),
        0
      ),
    }));

    res.status(200).json(catalogList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch catalog." });
  }
});

router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, unit, imageUrl, instances } = req.body;

    const inventoryItem = await Inventory.findByPk(id);
    if (!inventoryItem) {
      return res.status(404).json({ error: "Inventory item not found." });
    }

    if (!instances || instances.length === 0) {
      return res
        .status(400)
        .json({ error: "Must provide at least one control number instance." });
    }

    await inventoryItem.update({
      name,
      category,
      unit,
      imageUrl,
    });

    const payloadInstanceIds = instances
      .map((inst) => inst.id)
      .filter((instId) => instId != null);

    await ItemInstance.destroy({
      where: {
        inventoryId: id,
        id: {
          [Op.notIn]: payloadInstanceIds.length > 0 ? payloadInstanceIds : [0],
        },
      },
    });

    for (const inst of instances) {
      const instanceData = {
        controlNumber: inst.controlNumber,
        condition: inst.condition,
        expirationDate: inst.expirationDate,
        inventoryId: id,
        quantity:
          category === "EQUIPMENT" ||
          category === "GLASSWARE" ||
          category === "CLEANING"
            ? 1
            : inst.quantity || 0,
      };

      if (inst.id) {
        await ItemInstance.update(instanceData, { where: { id: inst.id } });
      } else {
        await ItemInstance.create(instanceData);
      }
    }

    res.status(200).json({ message: "Inventory updated successfully!" });
  } catch (error) {
    console.error("Update failed:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        error: "One or more Control Numbers already exist in the database.",
      });
    }
    res.status(500).json({ error: "Failed to update inventory." });
  }
});

router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const inventoryItem = await Inventory.findByPk(id);
    if (!inventoryItem) {
      return res.status(404).json({ error: "Inventory item not found." });
    }

    await ItemInstance.destroy({ where: { inventoryId: id } });
    await inventoryItem.destroy();

    res.status(200).json({ message: "Inventory deleted successfully!" });
  } catch (error) {
    console.error("Delete failed:", error);
    res.status(500).json({ error: "Failed to delete inventory." });
  }
});

module.exports = router;