const express = require("express");
const router = express.Router();
const { Inventory } = require("../models");

router.get("/equipment", async (req, res) => {
  try {
   
    const equipmentList = await Inventory.findAll({
      attributes: ["name"],
      where: {
        category: "EQUIPMENT",
      }
    });

    res.status(200).json(equipmentList);
  } catch (error) {
    console.error("Error fetching equipment for Wiki:", error);
    res.status(500).json({ message: "Failed to retrieve equipment data." });
  }
});

module.exports = router;