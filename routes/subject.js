const express = require("express");
const router = express.Router();
const { Subject, FacultySection } = require("../models");
const { verifyToken } = require("../middleware/authMiddleware");

// GET: Fetch all subjects belonging to the logged-in faculty
router.get("/", verifyToken, async (req, res) => {
  try {
    const facultyId = req.user.id;

    const subjects = await Subject.findAll({
      where: { facultyId: facultyId }, 
      include: [
        {
          model: FacultySection,
          as: "section", // <-- UPDATED ALIAS TO MATCH MODEL
          attributes: ["year", "section"],
        },
      ],
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
    const facultyId = req.user.id;

    if (!name) {
      return res.status(400).json({ error: "Subject name is required" });
    }
    
    if (!fullSectionName) {
      return res.status(400).json({ error: "Section name is required" });
    }

    // 1. Split the section name (e.g., "4 - A")
    const [year, sectionName] = fullSectionName.split(" - ");
    
    if (!year || !sectionName) {
      return res.status(400).json({ error: "Invalid section format. Expected 'Year - Section'" });
    }

    // 2. Find or Create the FacultySection FIRST (since it acts as the organizer)
    const [facultySection] = await FacultySection.findOrCreate({
      where: {
        facultyId: facultyId,
        year: year,
        section: sectionName,
      },
    });

    // 3. Find or Create the Subject, attaching it to the newly found/created sectionId
    const [subject, created] = await Subject.findOrCreate({
      where: {
        name: name,
        facultyId: facultyId,
        sectionId: facultySection.id, // <-- ADDED SECTION ID HERE
      },
    });

    // 4. Fetch the complete subject object WITH relationships so the frontend state updates perfectly
    const fullSubject = await Subject.findByPk(subject.id, {
      include: [
        {
          model: FacultySection,
          as: "section", // <-- UPDATED ALIAS
          attributes: ["year", "section"],
        },
      ],
    });

    res.status(201).json(fullSubject);
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
        facultyId: facultyId, 
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