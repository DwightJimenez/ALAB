const express = require("express");
const { GradingCriteria } = require("../models");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// GET: Fetch all criteria profiles for the logged-in faculty
router.get("/:facultyId", verifyToken, async (req, res) => {
  try {
    const { facultyId } = req.params;
    const criteriaList = await GradingCriteria.findAll({
      where: { facultyId },
      order: [["createdAt", "DESC"]],
    });
    res.status(200).json(criteriaList);
  } catch (error) {
    console.error("Fetch criteria error:", error);
    res.status(500).json({ error: "Failed to load rubric criteria profiles." });
  }
});

// POST: Create a new rubric criteria profile
router.post("/", verifyToken, async (req, res) => {
  try {
    const { facultyId, name, components } = req.body;

    if (!name || !components || components.length === 0) {
      return res
        .status(400)
        .json({ error: "Name and components are required." });
    }

    const newCriteria = await GradingCriteria.create({
      facultyId,
      name,
      components,
    });

    res.status(201).json(newCriteria);
  } catch (error) {
    console.error("Create criteria error:", error);
    res.status(500).json({ error: "Failed to save rubric criteria." });
  }
});

// DELETE: Remove a rubric criteria profile
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const criteria = await GradingCriteria.findByPk(id);

    if (!criteria) {
      return res.status(404).json({ error: "Criteria profile not found." });
    }

    await criteria.destroy();
    res.status(200).json({ message: "Criteria profile deleted successfully." });
  } catch (error) {
    console.error("Delete criteria error:", error);
    res.status(500).json({ error: "Failed to delete criteria profile." });
  }
});

module.exports = router;
