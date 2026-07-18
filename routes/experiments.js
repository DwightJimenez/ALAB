const express = require("express");
const { ExperimentTemplate, User, ExperimentAssignment, Question } = require("../models");
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
    const { title, materials, instructionsHTML,skillId } = req.body;

    const experiment = await ExperimentTemplate.findByPk(id);
    
    if (!experiment) {
      return res.status(404).json({ error: "Experiment template not found." });
    }

    // Update the fields
    experiment.title = title;
    experiment.materials = materials;
    experiment.instructionsHTML = instructionsHTML;
    experiment.skillId = skillId;
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

// POST: Assign an experiment to a section
//Sync assignments (Create, Update, or Delete to prevent duplicate rows) ---
router.post("/:id/assign", verifyToken, async (req, res) => {
  try {
    const { id } = req.params; 
    const { yearAndSections, dueDate, requireSafetyGate } = req.body;

    if (!yearAndSections || !Array.isArray(yearAndSections)) {
      return res.status(400).json({ error: "Invalid data format." });
    }

    // 1. Get all current assignments for this template from the DB
    const existingAssignments = await ExperimentAssignment.findAll({
      where: { templateId: id }
    });
    // Extract just the section strings (e.g., ["4A", "4B"])
    const existingSections = existingAssignments.map(a => a.yearAndSection);

    // 2. DELETE sections that the user UNCHECKED
    const sectionsToRemove = existingSections.filter(sec => !yearAndSections.includes(sec));
    if (sectionsToRemove.length > 0) {
      await ExperimentAssignment.destroy({
        // Deletes all rows matching this templateId and the unchecked sections
        where: { templateId: id, yearAndSection: sectionsToRemove } 
      });
    }

    // 3. CREATE or UPDATE the selected sections
    const updatedAssignments = await Promise.all(
      yearAndSections.map(async (section) => {
        // Look for the existing row
        const assignment = await ExperimentAssignment.findOne({
          where: { templateId: id, yearAndSection: section }
        });

        if (assignment) {
          // UPDATE: If it exists in DB, update fields so we don't add duplicate rows
          assignment.dueDate = dueDate ? dueDate : null;
          assignment.activeSafetyGate = requireSafetyGate;
          await assignment.save();
          return assignment;
        } else {
          // CREATE: If it's a new checkmark, create it
          return await ExperimentAssignment.create({
            templateId: id,
            yearAndSection: section,
            dueDate: dueDate ? dueDate : null,
            activeSafetyGate: requireSafetyGate,
          });
        }
      })
    );

    res.status(200).json({ 
      message: "Assignments synchronized successfully!", 
      assignments: updatedAssignments 
    });
  } catch (error) {
    console.error("Failed to sync assignments:", error);
    res.status(500).json({ error: "Failed to sync experiment assignments." });
  }
});

// --- Fetch existing assignments for a specific template to pre-fill checkboxes ---
router.get("/:id/assignments", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const assignments = await ExperimentAssignment.findAll({
      where: { templateId: id },
    });
    res.status(200).json(assignments);
  } catch (error) {
    console.error("Failed to fetch template assignments:", error);
    res.status(500).json({ error: "Failed to load current assignments." });
  }
});


// GET: Fetch all assignments for a specific student's section
router.get("/assignments/:section", verifyToken, async (req, res) => {
  try {
    const { section } = req.params;

    const assignments = await ExperimentAssignment.findAll({
      where: { yearAndSection: section, status: "ACTIVE" },
      include: [
        {
          model: ExperimentTemplate,
          as: "template",
          attributes: ["title", "materials", "instructionsHTML"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(assignments);
  } catch (error) {
    console.error("Failed to fetch assignments:", error);
    res.status(500).json({ error: "Failed to load assignments." });
  }
});

// --- BULK SAVE AI QUIZ TO DB ---
router.put("/:id/quiz", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { questions } = req.body;

    // 1. Find the experiment to get its linked skillId
    const experiment = await ExperimentTemplate.findByPk(id);
    if (!experiment) return res.status(404).json({ error: "Experiment not found." });
    
    if (!experiment.skillId) {
      return res.status(400).json({ error: "Experiment must have a selected Skill before saving a quiz." });
    }

    // 2. Format the AI questions for the Database
    const formattedQuestions = questions.map((q) => {
      // Map Gemini's index back to the exact string required by your DB
      const actualCorrectAnswer = q.options[q.correctAnswerIndex];

      return {
        skillId: experiment.skillId, // Attach the questions to the template's skill
        text: q.questionText,
        options: JSON.stringify(q.options),
        correctAnswer: actualCorrectAnswer,
      };
    });

    // 3. Bulk insert
    await Question.bulkCreate(formattedQuestions);

    res.status(200).json({ message: "Safety Gate Quiz locked in successfully!" });
  } catch (error) {
    console.error("Quiz save error:", error);
    res.status(500).json({ error: "Failed to lock in the generated quiz." });
  }
});

// DELETE: Remove an existing experiment template
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const experiment = await ExperimentTemplate.findByPk(id);
    
    if (!experiment) {
      return res.status(404).json({ error: "Experiment template not found." });
    }

    await experiment.destroy();

    res.status(200).json({
      message: "Experiment Template deleted successfully!",
    });
  } catch (error) {
    console.error("Failed to delete experiment:", error);
    res.status(500).json({ error: "Failed to delete experiment template." });
  }
});

module.exports = router;