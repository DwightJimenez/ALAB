const express = require("express");
const router = express.Router();
const { Subject, FacultySection } = require("../models");
const { verifyToken } = require("../middleware/authMiddleware");

// GET: Fetch all subjects belonging to the logged-in faculty
router.get("/", verifyToken, async (req, res) => {
  try {
    const facultyId = req.user.id;

    const subjects = await Subject.findAll({
      where: { facultyId: facultyId }, // <-- Only fetch subjects owned by this teacher
      order: [["name", "ASC"]],
    });

    res.status(200).json(subjects);
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});

// POST: Create a new subject for the logged-in faculty
router.post("/", verifyToken, async (req, res) => {
  try {
    const { name, fullSectionName } = req.body;
    const facultyId = req.user.id; // <-- Securely grab facultyId from token

    if (!name) {
      return res.status(400).json({ error: "Subject name is required" });
    }

    // 1. Find the subject for THIS faculty if it exists, or create it if it doesn't
    const [subject, created] = await Subject.findOrCreate({
      where: {
        name: name,
        facultyId: facultyId,
      },
    });

    // 2. (Optional) Link the Subject to the Faculty and Section in FacultySections
    // We make this optional because the frontend "Add Subject" modal only sends 'name'
    if (fullSectionName) {
      const [year, section] = fullSectionName.split(" - ");
      if (year && section) {
        await FacultySection.findOrCreate({
          where: {
            facultyId: facultyId,
            subjectId: subject.id,
            year: year,
            section: section,
          },
        });
      }
    }

    res.status(201).json(subject);
  } catch (error) {
    console.error("Error creating subject:", error);
    res.status(500).json({ error: "Failed to create subject" });
  }
});

// PUT: Update subject weights
router.put("/:subjectId/weights", verifyToken, async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { wwWeight, ptWeight, qaWeight } = req.body;
    const facultyId = req.user.id;

    const subject = await Subject.findOne({
      where: {
        id: subjectId,
        facultyId: facultyId, // <-- Ensure the teacher actually owns this subject
      },
    });

    if (!subject) {
      return res
        .status(404)
        .json({ error: "Subject not found or unauthorized access" });
    }

    await subject.update({ wwWeight, ptWeight, qaWeight });
    res.status(200).json({ message: "Weights updated successfully", subject });
  } catch (error) {
    console.error("Error updating weights:", error);
    res.status(500).json({ error: "Failed to update weights" });
  }
});

module.exports = router;
