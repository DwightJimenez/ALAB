const express = require("express");
const { Inventory } = require("../models");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// GET all inventory items (Technicians & Admins only)
router.get("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const items = await Inventory.findAll({
      order: [
        ["category", "ASC"],
        ["name", "ASC"],
      ],
    });
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch inventory." });
  }
});

// POST a new item
router.post("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, category, quantity, unit, expirationDate } = req.body;

    const newItem = await Inventory.create({
      name,
      category,
      quantity,
      unit,
      expirationDate: expirationDate || null, // Handle empty dates
    });

    res.status(201).json({ message: "Item added successfully", item: newItem });
  } catch (error) {
    res.status(500).json({ error: "Failed to add item." });
  }
});

router.post("/batch", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res
        .status(400)
        .json({ error: "No items provided for batch creation." });
    }

    // --- THE FIX: Sanitize the data and enforce category rules ---
    const sanitizedItems = items.map((item) => {
      let cleanExpDate = item.expirationDate ? item.expirationDate : null;
      let cleanQuantity = item.quantity;
      let cleanUnit = item.unit;

      // RULE 1: Only Chemicals can have expiration dates
      if (item.category !== "CHEMICAL") {
        cleanExpDate = null;
      }

      // RULE 2: Equipment represents a single unique physical item
      if (item.category === "EQUIPMENT") {
        cleanQuantity = 1;
        cleanUnit = "pcs";
      }

      return {
        ...item,
        expirationDate: cleanExpDate,
        quantity: cleanQuantity,
        unit: cleanUnit,
      };
    });

    // Insert multiple rows into PostgreSQL simultaneously using the cleaned data
    const newItems = await Inventory.bulkCreate(sanitizedItems, {
      validate: true,
    });

    res
      .status(201)
      .json({ message: "Batch added successfully", count: newItems.length });
  } catch (error) {
    console.error("Batch insert failed:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        error: "One or more Control Numbers already exist in the database.",
      });
    }
    res.status(500).json({ error: "Failed to process batch." });
  }
});

module.exports = router;
