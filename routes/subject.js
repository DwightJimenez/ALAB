const express = require("express");
const router = express.Router();
const { Subject, FacultySection } = require("../models");
const { verifyToken } = require("../middleware/authMiddleware");


// GET: Fetch all subjects
router.get("/", async (req, res) => {
  try {
    const subjects = await Subject.findAll({
      order: [["name", "ASC"]],
    });
    res.status(200).json(subjects);
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});

// POST: Create a new subject AND link it to the faculty
router.post("/", async (req, res) => {
  try {
    const { name, facultyId, fullSectionName } = req.body;

    if (!name || !facultyId || !fullSectionName) {
      return res
        .status(400)
        .json({ error: "Subject name, facultyId, and section are required" });
    }

    // 1. Split "12 - STEM B" into year and section
    const [year, section] = fullSectionName.split(" - ");

    // 2. Find the subject if it exists, or create it if it doesn't
    const [subject, created] = await Subject.findOrCreate({
      where: { name: name },
    });

    // 3. Link the Subject to the Faculty and Section in FacultySections
    // We use findOrCreate here too so we don't accidentally create duplicate assignments
    await FacultySection.findOrCreate({
      where: {
        facultyId: facultyId,
        subjectId: subject.id,
        year: year,
        section: section,
      },
    });

    res.status(201).json(subject);
  } catch (error) {
    console.error("Error creating subject:", error);
    res.status(500).json({ error: "Failed to create subject" });
  }
});

// Example Express route to update subject weights
router.put("/:subjectId/weights", verifyToken, async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { wwWeight, ptWeight, qaWeight } = req.body;

    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      return res.status(404).json({ error: "Subject not found" });
    }

    await subject.update({ wwWeight, ptWeight, qaWeight });
    res.status(200).json({ message: "Weights updated successfully", subject });
  } catch (error) {
    console.error("Error updating weights:", error);
    res.status(500).json({ error: "Failed to update weights" });
  }
});

module.exports = router;
