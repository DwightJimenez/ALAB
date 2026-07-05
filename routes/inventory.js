const express = require("express");
const { Inventory, ItemInstance } = require("../models");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// GET all inventory items WITH their instances
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
        },
      ],
      order: [["name", "ASC"],
        ["category", "ASC"],
        
      ],
    });
    res.status(200).json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch inventory." });
  }
});

// POST to create an Inventory Item and its Physical Instances
router.post("/batch", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, category, totalQuantity, unit, imageUrl, instances } =
      req.body;

    if (!instances || instances.length === 0) {
      return res
        .status(400)
        .json({ error: "Must provide at least one control number instance." });
    }

    // 1. Create the Main Catalog Item
    const newInventory = await Inventory.create({
      name,
      category,
      unit,
      totalQuantity,
      imageUrl,
    });

    // 2. Format the instances to link to the new Inventory ID
    const formattedInstances = instances.map((inst) => ({
      ...inst,
      inventoryId: newInventory.id,
      quantity:
        category === "EQUIPMENT" || category === "GLASSWARE"
          ? 1
          : totalQuantity,
    }));

    // 3. Bulk insert the physical items into the ItemInstance table
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

// --- 1. STUDENT: Request a material (WITH STOCK VALIDATION) ---
router.post("/request", verifyToken, async (req, res) => {
  try {
    const { inventoryId, amountRequested } = req.body;
    const studentId = req.user.id;

    // Check if the item exists and has enough stock
    const item = await Inventory.findByPk(inventoryId);
    if (!item) return res.status(404).json({ error: "Item not found." });

    if (item.quantity < amountRequested) {
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

// --- 2. TECHNICIAN: View all pending requests ---
router.get("/requests/pending", verifyToken, requireAdmin, async (req, res) => {
  try {
    const requests = await MaterialRequest.findAll({
      where: { status: "PENDING" },
      include: [User, Inventory], // Fetches student name and item name
    });
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch requests." });
  }
});

// --- 3. TECHNICIAN: Approve request (WITH AUTOMATIC DEDUCTION) ---
router.put(
  "/requests/:id/approve",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    const { controlNumber } = req.body; // Technician picks the CN here
    const request = await MaterialRequest.findByPk(req.params.id);
    const item = await Inventory.findOne({ where: { controlNumber } });

    // Deduct from the specific CN
    item.quantity -= request.amountRequested;
    await item.save();

    request.status = "APPROVED";
    request.assignedCN = controlNumber; // Store the CN on the request
    await request.save();

    res.status(200).json({ message: "Approved and CN assigned." });
  },
);

router.get("/catalog", verifyToken, async (req, res) => {
  try {
    const items = await Inventory.findAll({
      attributes: [
        "name",
        "category",
        "unit",
        // This adds up the quantity of all items with the same name
        [sequelize.fn("SUM", sequelize.col("quantity")), "totalQuantity"],
      ],
      group: ["name", "category", "unit"],
    });
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch catalog." });
  }
});

module.exports = router;
