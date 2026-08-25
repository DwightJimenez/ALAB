const express = require("express");
const {
  ExperimentTemplate,
  User,
  ExperimentAssignment,
  Question,
  Skill,
  Subject,
} = require("../models");
const { verifyToken } = require("../middleware/authMiddleware");
const { sendAssignmentNotification } = require("../utils/emailService");

const router = express.Router();

// POST: Create Experiment Template
router.post("/create", verifyToken, async (req, res) => {
  try {
    const {
      title,
      subjectId,
      criteria,
      objective,
      materials,
      instructionsHTML,
      skillIds,
      isGroupSubmission,
      maxGroupSize,
      enablePeerEvaluation,
      peerEvaluationCriteria,
    } = req.body;

    const newExperiment = await ExperimentTemplate.create({
      facultyId: req.user.id,
      title: title || "Untitled Experiment",
      instructionsHTML: instructionsHTML || "<p></p>",
      subjectId: subjectId || null,
      criteria: criteria || null,
      objective: objective || "",
      materials: materials || [],
      skillIds: skillIds || [],
      isGroupSubmission: isGroupSubmission || false,
      maxGroupSize: maxGroupSize || 1,
      enablePeerEvaluation: enablePeerEvaluation || false,
      peerEvaluationCriteria: peerEvaluationCriteria || [],
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

// GET: Fetch all templates created by THIS teacher (For Library)
router.get("/", verifyToken, async (req, res) => {
  try {
    const templates = await ExperimentTemplate.findAll({
      where: { facultyId: req.user.id },
      include: [
        { model: User, as: "faculty", attributes: ["name"] },
        {
          model: Subject,
          as: "subject",
          attributes: ["name"],
          required: false,
        },
        // <-- UPDATED: GradingCriteria include removed entirely
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
      criteria,
      materials,
      instructionsHTML,
      skillIds,
      isGroupSubmission,
      maxGroupSize,
      enablePeerEvaluation,
      peerEvaluationCriteria,
    } = req.body;

    // Secure search: Must match both ID and Faculty ID
    const experiment = await ExperimentTemplate.findOne({
      where: { id: id, facultyId: req.user.id },
    });

    if (!experiment) {
      return res.status(404).json({
        error: "Experiment template not found or unauthorized access.",
      });
    }

    // Use the same safe fallbacks here for editing
    experiment.title = title || "Untitled Experiment";
    experiment.instructionsHTML = instructionsHTML || "<p></p>";
    experiment.subjectId = subjectId || null;
    experiment.criteria = criteria || null;
    experiment.materials = materials || [];
    experiment.skillIds = skillIds || [];
    experiment.isGroupSubmission = isGroupSubmission || false;
    experiment.maxGroupSize = maxGroupSize || 1;
    experiment.enablePeerEvaluation = enablePeerEvaluation || false;
    experiment.peerEvaluationCriteria = peerEvaluationCriteria || [];

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

    // First check if the teacher actually owns this template
    const templateCheck = await ExperimentTemplate.findOne({
      where: { id: id, facultyId: req.user.id },
    });
    if (!templateCheck) {
      return res
        .status(403)
        .json({ error: "Unauthorized access to this template." });
    }

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

    const studentsBySection = await Promise.all(
      yearAndSections.map(async (section) => {
        const yearSectionParts = section.includes(" - ")
          ? section.split(" - ")
          : [null, section];
        const [yearValue, sectionValue] = yearSectionParts;

        const students = await User.findAll({
          where: {
            role: "STUDENT",
            ...(yearValue ? { year: yearValue } : {}),
            ...(sectionValue ? { section: sectionValue } : {}),
          },
          attributes: ["name", "email"],
        });

        return {
          section,
          students,
        };
      }),
    );

    await Promise.all(
      studentsBySection.map(async ({ section, students }) => {
        if (!students.length) return;

        await sendAssignmentNotification({
          recipients: students.map((student) => ({
            email: student.email,
            name: student.name,
          })),
          title: templateCheck.title,
          dueDate,
          section,
          facultyName: req.user?.name || "Faculty",
        });
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

    // Optional Security: check if teacher owns the template first
    const templateCheck = await ExperimentTemplate.findOne({
      where: { id: id, facultyId: req.user.id },
    });
    if (!templateCheck) {
      return res
        .status(403)
        .json({ error: "Unauthorized access to this template." });
    }

    const assignments = await ExperimentAssignment.findAll({
      where: { templateId: id },
    });
    res.status(200).json(assignments);
  } catch (error) {
    console.error("Failed to fetch template assignments:", error);
    res.status(500).json({ error: "Failed to load current assignments." });
  }
});

// GET: Fetch Active Assignments for a specific Section (Used by Students)
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
            "criteria", // <-- UPDATED: Serves embedded JSON directly to students
            "materials",
            "instructionsHTML",
            "isGroupSubmission",
            "maxGroupSize",
            "enablePeerEvaluation",
            "peerEvaluationCriteria",
          ],
          include: [
            { model: Subject, as: "subject", attributes: ["name"] },
            // <-- UPDATED: GradingCriteria include removed entirely
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

// PUT: Save AI-Generated Skills and Quiz for Safety Gate
router.put("/:id/quiz", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { skills, questions } = req.body; // <-- Now grabbing both skills and questions

    const experiment = await ExperimentTemplate.findOne({
      where: { id: id, facultyId: req.user.id },
    });

    if (!experiment)
      return res.status(404).json({ error: "Experiment not found or unauthorized." });

    if (!skills || !questions || skills.length === 0 || questions.length === 0) {
      return res.status(400).json({
        error: "Both skills and questions must be provided to lock in the quiz.",
      });
    }

    // 1. Create the AI-generated Skills in the database
    const createdSkills = await Promise.all(
      skills.map(async (skillData) => {
        return await Skill.create({
          name: skillData.name,
          description: `Auto-generated for Experiment: ${experiment.title}`,
          // Map the frontend's AI parameter names to your database schema names
          pL0: parseFloat(skillData.p_init) || 0.25,
          pT: parseFloat(skillData.p_transit) || 0.20,
          pS: parseFloat(skillData.p_slip) || 0.10,
          pG: parseFloat(skillData.p_guess) || 0.25,
          masteryThreshold: 0.95, // Default safety threshold
          facultyId: req.user.id, // Assign ownership to this teacher
        });
      })
    );

    // 2. Append the new skill IDs to the Experiment Template
    const newSkillIds = createdSkills.map((s) => s.id);
    const existingSkillIds = Array.isArray(experiment.skillIds) ? experiment.skillIds : [];
    
    // Merge existing skills with new ones and remove duplicates
    experiment.skillIds = [...new Set([...existingSkillIds, ...newSkillIds])];
    await experiment.save();

    // 3. Format and save the Questions linked to the newly created Skills
    const formattedQuestions = questions.map((q) => {
      const actualCorrectAnswer = q.options[q.correctAnswerIndex];

      // Match the targeted skill text from the frontend to the newly created DB skills
      const matchedSkill = createdSkills.find(
        (s) => s.name.toLowerCase() === (q.targetedSkill || "").toLowerCase(),
      );

      // Fallback to the first generated skill if exact match fails
      const assignedSkillId = matchedSkill ? matchedSkill.id : createdSkills[0].id;

      return {
        skillId: assignedSkillId,
        text: q.questionText,
        options: JSON.stringify(q.options),
        correctAnswer: actualCorrectAnswer,
      };
    });

    await Question.bulkCreate(formattedQuestions);

    res.status(200).json({ 
      message: "Safety Gate Skills and Quiz locked in successfully!",
      addedSkills: newSkillIds 
    });
  } catch (error) {
    console.error("Quiz save error:", error);
    res.status(500).json({ error: "Failed to lock in the generated skills and quiz." });
  }
});

// DELETE: Remove Template
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const experiment = await ExperimentTemplate.findOne({
      where: { id: id, facultyId: req.user.id },
    });

    if (!experiment) {
      return res
        .status(404)
        .json({ error: "Experiment template not found or unauthorized." });
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
