const express = require("express");
const { ExperimentTemplate, User } = require("../models");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// POST: Save a new experiment template
router.post("/create", verifyToken, async (req, res) => {
  try {
    const { title, objective, materials, instructionsHTML } = req.body;

    // Basic validation
    if (!title || !instructionsHTML) {
      return res.status(400).json({ error: "Title and Instructions are required." });
    }

    // Save to database, linking it to the logged-in faculty member
    const newExperiment = await ExperimentTemplate.create({
      facultyId: req.user.id, // Comes from verifyToken middleware
      title,
      objective,
      materials,
      instructionsHTML,
    });

    res.status(201).json({
      message: "Experiment Template saved successfully!",
      experiment: newExperiment,
    });
  } catch (error) {
    console.error("Failed to save experiment:", error);
    res.status(500).json({ error: "Failed to save experiment template." });
  }
});

// GET: Fetch all experiment templates
router.get("/", verifyToken, async (req, res) => {
  try {
    const templates = await ExperimentTemplate.findAll({
      // Include the faculty member's name who created it
      include: [{ model: User, as: "faculty", attributes: ["name"] }],
      order: [["createdAt", "DESC"]], // Newest first
    });

    res.status(200).json(templates);
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    res.status(500).json({ error: "Failed to load experiment templates." });
  }
});

// PUT: Update an existing experiment template
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, materials, instructionsHTML } = req.body;

    const experiment = await ExperimentTemplate.findByPk(id);
    
    if (!experiment) {
      return res.status(404).json({ error: "Experiment template not found." });
    }

    // Update the fields
    experiment.title = title;
    experiment.materials = materials;
    experiment.instructionsHTML = instructionsHTML;
    
    await experiment.save();

    res.status(200).json({
      message: "Experiment Template updated successfully!",
      experiment,
    });
  } catch (error) {
    console.error("Failed to update experiment:", error);
    res.status(500).json({ error: "Failed to update experiment template." });
  }
});

module.exports = router;