const express = require("express");
const { Skill } = require("../models");
const { verifyToken } = require("../middleware/authMiddleware"); // Ensure faculty access here

const router = express.Router();

// Get all skills created by the logged-in faculty
router.get("/", verifyToken, async (req, res) => {
  try {
    const skills = await Skill.findAll({
      where: { facultyId: req.user.id },
      order: [["createdAt", "DESC"]], // Shows the newest skills first
    });
    res.json(skills);
  } catch (error) {
    console.error("Error fetching skills:", error);
    res.status(500).json({ error: "Failed to fetch skills" });
  }
});

// Add a skill and link it to the logged-in faculty
router.post("/", verifyToken, async (req, res) => {
  try {
    const skill = await Skill.create({
      ...req.body,
      facultyId: req.user.id, // Securely assigns the skill to the teacher
    });
    res.status(201).json(skill);
  } catch (error) {
    console.error("Error creating skill:", error);
    res.status(500).json({ error: "Failed to create skill" });
  }
});

// Edit a skill (only if the faculty owns it)
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const skill = await Skill.findOne({
      where: { id: req.params.id, facultyId: req.user.id },
    });

    if (!skill) {
      return res
        .status(404)
        .json({ error: "Skill not found or unauthorized access" });
    }

    await skill.update(req.body);
    res.json({ message: "Skill updated successfully", skill });
  } catch (error) {
    console.error("Error updating skill:", error);
    res.status(500).json({ error: "Failed to update skill" });
  }
});

// Delete a skill (only if the faculty owns it)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const skill = await Skill.findOne({
      where: { id: req.params.id, facultyId: req.user.id },
    });

    if (!skill) {
      return res
        .status(404)
        .json({ error: "Skill not found or unauthorized access" });
    }

    await skill.destroy();
    res.json({ message: "Skill deleted successfully" });
  } catch (error) {
    console.error("Error deleting skill:", error);
    res.status(500).json({ error: "Failed to delete skill" });
  }
});

module.exports = router;
