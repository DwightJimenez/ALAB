const express = require("express");
const {
  ExperimentTemplate,
  User,
  ExperimentAssignment,
  Question,
  Skill,
  Subject, // <-- ADDED SUBJECT MODEL
} = require("../models");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// POST: Create Experiment Template
router.post("/create", verifyToken, async (req, res) => {
  try {
    const {
      title,
      subjectId, // <-- ADDED THIS
      objective,
      materials,
      instructionsHTML,
      skillIds,
      isGroupSubmission,
      maxGroupSize,
    } = req.body;

    // Added subjectId to validation
    if (!title || !instructionsHTML || !subjectId) {
      return res
        .status(400)
        .json({ error: "Title, Subject, and Instructions are required." });
    }

    const newExperiment = await ExperimentTemplate.create({
      facultyId: req.user.id,
      subjectId, // <-- SAVE TO DB
      title,
      objective,
      materials,
      instructionsHTML,
      skillIds,
      isGroupSubmission,
      maxGroupSize,
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

// GET: Fetch all templates (For Library)
router.get("/", verifyToken, async (req, res) => {
  try {
    const templates = await ExperimentTemplate.findAll({
      include: [
        { model: User, as: "faculty", attributes: ["name"] },
        { model: Subject, as: "subject", attributes: ["name"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(templates);
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    res.status(500).json({ error: "Failed to load experiment templates." });
  }
});

// PUT: Edit Template
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      subjectId,
      materials,
      instructionsHTML,
      skillIds,
      isGroupSubmission,
      maxGroupSize,
    } = req.body;

    const experiment = await ExperimentTemplate.findByPk(id);

    if (!experiment) {
      return res.status(404).json({ error: "Experiment template not found." });
    }

    experiment.title = title;
    experiment.subjectId = subjectId; 
    experiment.materials = materials;
    experiment.instructionsHTML = instructionsHTML;
    experiment.skillIds = skillIds;
    experiment.isGroupSubmission = isGroupSubmission;
    experiment.maxGroupSize = maxGroupSize;

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

// POST: Assign Template to Sections
router.post("/:id/assign", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { yearAndSections, dueDate, requireSafetyGate } = req.body;

    if (!yearAndSections || !Array.isArray(yearAndSections)) {
      return res.status(400).json({ error: "Invalid data format." });
    }

    const existingAssignments = await ExperimentAssignment.findAll({
      where: { templateId: id },
    });
    const existingSections = existingAssignments.map((a) => a.yearAndSection);

    const sectionsToRemove = existingSections.filter(
      (sec) => !yearAndSections.includes(sec),
    );
    if (sectionsToRemove.length > 0) {
      await ExperimentAssignment.destroy({
        where: { templateId: id, yearAndSection: sectionsToRemove },
      });
    }

    const updatedAssignments = await Promise.all(
      yearAndSections.map(async (section) => {
        const assignment = await ExperimentAssignment.findOne({
          where: { templateId: id, yearAndSection: section },
        });

        if (assignment) {
          assignment.dueDate = dueDate ? dueDate : null;
          assignment.activeSafetyGate = requireSafetyGate;
          await assignment.save();
          return assignment;
        } else {
          return await ExperimentAssignment.create({
            templateId: id,
            yearAndSection: section,
            dueDate: dueDate ? dueDate : null,
            activeSafetyGate: requireSafetyGate,
          });
        }
      }),
    );

    res.status(200).json({
      message: "Assignments synchronized successfully!",
      assignments: updatedAssignments,
    });
  } catch (error) {
    console.error("Failed to sync assignments:", error);
    res.status(500).json({ error: "Failed to sync experiment assignments." });
  }
});

// GET: Fetch assignments for a specific template
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

// GET: Fetch Active Assignments for a specific Section
router.get("/assignments/:section", verifyToken, async (req, res) => {
  try {
    const { section } = req.params;

    const assignments = await ExperimentAssignment.findAll({
      where: { yearAndSection: section, status: "ACTIVE" },
      include: [
        {
          model: ExperimentTemplate,
          as: "template",
          attributes: [
            "title",
            "subjectId", 
            "materials",
            "instructionsHTML",
            "isGroupSubmission",
            "maxGroupSize",
          ],
          include: [{ model: Subject, as: "subject", attributes: ["name"] }],
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

// PUT: Save Quiz for Safety Gate
router.put("/:id/quiz", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { questions } = req.body;

    const experiment = await ExperimentTemplate.findByPk(id);
    if (!experiment)
      return res.status(404).json({ error: "Experiment not found." });

    if (!experiment.skillIds || experiment.skillIds.length === 0) {
      return res.status(400).json({
        error: "Experiment must have selected Skills before saving a quiz.",
      });
    }

    const skills = await Skill.findAll({
      where: { id: experiment.skillIds },
    });

    const formattedQuestions = questions.map((q) => {
      const actualCorrectAnswer = q.options[q.correctAnswerIndex];

      const matchedSkill = skills.find(
        (s) => s.name.toLowerCase() === (q.targetedSkill || "").toLowerCase(),
      );

      const assignedSkillId = matchedSkill
        ? matchedSkill.id
        : experiment.skillIds[0];

      return {
        skillId: assignedSkillId,
        text: q.questionText,
        options: JSON.stringify(q.options),
        correctAnswer: actualCorrectAnswer,
      };
    });

    await Question.bulkCreate(formattedQuestions);

    res
      .status(200)
      .json({ message: "Safety Gate Quiz locked in successfully!" });
  } catch (error) {
    console.error("Quiz save error:", error);
    res.status(500).json({ error: "Failed to lock in the generated quiz." });
  }
});

// DELETE: Remove Template
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
