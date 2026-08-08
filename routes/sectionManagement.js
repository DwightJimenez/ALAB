const express = require("express");
const { User, FacultySection } = require("../models");
const router = express.Router();

// --- ADMIN: Get ALL faculty members and their assigned sections ---
router.get("/all-faculty", async (req, res) => {
  try {
    const faculty = await User.findAll({
      where: { role: "FACULTY" },
      attributes: ["id", "name", "email"],
      include: [
        {
          model: FacultySection,
          as: "handledSections", // Must match your model associations
          attributes: ["id", "section"],
        },
      ],
      order: [["name", "ASC"]],
    });

    // Format the response so the UI can map over it easily
    const formattedFaculty = faculty.map((f) => ({
      id: f.id,
      name: f.name,
      email: f.email,
      assignedSections: f.handledSections,
    }));

    res.status(200).json(formattedFaculty);
  } catch (error) {
    console.error("Error fetching faculty list:", error);
    res.status(500).json({ error: "Failed to load faculty list." });
  }
});

// --- ADMIN: Assign a section to a teacher ---
router.post("/assign", async (req, res) => {
  try {
    const { facultyId, year, section } = req.body;

    const [assignment, created] = await FacultySection.findOrCreate({
      where: { facultyId, year, section },
    });

    if (!created) {
      return res
        .status(400)
        .json({ error: "Teacher is already assigned to this section." });
    }

    res
      .status(201)
      .json({ message: "Section assigned successfully!", assignment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to assign section." });
  }
});

// --- ADMIN: Remove a section from a teacher ---
router.delete("/remove/:id", async (req, res) => {
  try {
    await FacultySection.destroy({ where: { id: req.params.id } });
    res.status(200).json({ message: "Section assignment removed." });
  } catch (error) {
    res.status(500).json({ error: "Failed to remove assignment." });
  }
});

// --- FACULTY: Get my assigned sections ---
router.get("/my-sections/:facultyId", async (req, res) => {
  try {
    const sections = await FacultySection.findAll({
      where: { facultyId: req.params.facultyId },
      attributes: ["section"],
      order: [["section", "ASC"]],
    });

    // Map it to a flat array of strings: ["3A - BSCS", "4A - BSCS"]
    const sectionList = sections.map((s) => s.section);
    res.status(200).json(sectionList);
  } catch (error) {
    res.status(500).json({ error: "Failed to load your sections." });
  }
});

module.exports = router;
