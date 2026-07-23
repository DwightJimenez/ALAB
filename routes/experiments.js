const express = require("express");
const {
  ExperimentTemplate,
  User,
  ExperimentAssignment,
  Question,
} = require("../models");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/create", verifyToken, async (req, res) => {
  try {
    const {
      title,
      objective,
      materials,
      instructionsHTML,
      isGroupSubmission,
      maxGroupSize,
    } = req.body;

    if (!title || !instructionsHTML) {
      return res
        .status(400)
        .json({ error: "Title and Instructions are required." });
    }

    const newExperiment = await ExperimentTemplate.create({
      facultyId: req.user.id,
      title,
      objective,
      materials,
      instructionsHTML,
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

router.get("/", verifyToken, async (req, res) => {
  try {
    const templates = await ExperimentTemplate.findAll({
      include: [{ model: User, as: "faculty", attributes: ["name"] }],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(templates);
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    res.status(500).json({ error: "Failed to load experiment templates." });
  }
});

router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      materials,
      instructionsHTML,
      skillId,
      isGroupSubmission,
      maxGroupSize,
    } = req.body;

    const experiment = await ExperimentTemplate.findByPk(id);

    if (!experiment) {
      return res.status(404).json({ error: "Experiment template not found." });
    }

    experiment.title = title;
    experiment.materials = materials;
    experiment.instructionsHTML = instructionsHTML;
    experiment.skillId = skillId;
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
        // Look for the existing row
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
            "materials",
            "instructionsHTML",
            "isGroupSubmission",
            "maxGroupSize",
          ],
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

router.put("/:id/quiz", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { questions } = req.body;

    // 1. Find the experiment to get its linked skillId
    const experiment = await ExperimentTemplate.findByPk(id);
    if (!experiment)
      return res.status(404).json({ error: "Experiment not found." });

    if (!experiment.skillId) {
      return res.status(400).json({
        error: "Experiment must have a selected Skill before saving a quiz.",
      });
    }

    const formattedQuestions = questions.map((q) => {
      const actualCorrectAnswer = q.options[q.correctAnswerIndex];

      return {
        skillId: experiment.skillId,
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
