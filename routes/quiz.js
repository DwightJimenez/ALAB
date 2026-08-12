const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Op } = require("sequelize"); // <-- Make sure Op is imported
const {
  User,
  Skill,
  StudentSkill,
  Question,
  StudentAnswer,
  ExperimentAssignment,
  ExperimentTemplate,
  FacultySection, // <-- Make sure FacultySection is imported
} = require("../models");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");
const { calculateNewMastery } = require("../utils/bkt");

const router = express.Router();
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.get("/progress", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId);

    const combinedYearSection = `${user.year} - ${user.section}`;

    const activeGateAssignments = await ExperimentAssignment.findAll({
      where: {
        yearAndSection: combinedYearSection,
        activeSafetyGate: true,
      },
      include: [
        {
          model: ExperimentTemplate,
          as: "template",
          attributes: ["skillIds"],
        },
      ],
    });

    const requiresSafetyGate = activeGateAssignments.length > 0;

    const rawSkillIds = [];

    activeGateAssignments.forEach((assignment) => {
      let ids = assignment.template?.skillIds;

      if (typeof ids === "string") {
        try {
          ids = JSON.parse(ids);
        } catch (e) {
          ids = ids.split(",");
        }
      }

      if (Array.isArray(ids)) {
        rawSkillIds.push(...ids);
      }
    });

    const cleanSkillIds = rawSkillIds
      .map((id) => String(id).split(","))
      .flat()
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id));

    const assignedSkillIds = [...new Set(cleanSkillIds)];

    let skills = [];
    if (assignedSkillIds.length > 0) {
      skills = await Skill.findAll({
        where: {
          id: assignedSkillIds,
        },
      });
    }

    const progressData = await Promise.all(
      skills.map(async (skill) => {
        const [studentSkill] = await StudentSkill.findOrCreate({
          where: { userId, skillId: skill.id },
          defaults: { currentPL: skill.pL0, isMastered: false },
        });

        const questionCount = await Question.count({
          where: { skillId: skill.id },
        });

        return {
          id: skill.id,
          name: skill.name,
          description: skill.description,
          currentPL: studentSkill.currentPL,
          isMastered: studentSkill.isMastered,
          masteryThreshold: skill.masteryThreshold,
          hasQuestions: questionCount > 0,
        };
      }),
    );

    res.status(200).json({
      progressData,
      requiresSafetyGate,
    });
  } catch (error) {
    console.error("Progress fetch error:", error);
    res.status(500).json({ error: "Failed to fetch student progress." });
  }
});

// --- FACULTY FILTER ADDED ---
router.get("/skills", verifyToken, async (req, res) => {
  try {
    const skills = await Skill.findAll({
      where: { facultyId: req.user.id },
    });
    res.status(200).json(skills);
  } catch (error) {
    console.error("Skills fetch error:", error);
    res.status(500).json({ error: "Failed to fetch skills." });
  }
});

router.get("/question/:skillId", verifyToken, async (req, res) => {
  try {
    const questions = await Question.findAll({
      where: { skillId: req.params.skillId },
    });
    if (questions.length === 0)
      return res.status(404).json({ error: "No questions found." });

    const randomQ = questions[Math.floor(Math.random() * questions.length)];

    res.status(200).json({
      id: randomQ.id,
      text: randomQ.text,
      options: JSON.parse(randomQ.options),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch question." });
  }
});

router.post("/submit", verifyToken, async (req, res) => {
  try {
    const { questionId, userAnswer } = req.body;
    const userId = req.user.id;

    const question = await Question.findByPk(questionId, { include: Skill });
    if (!question)
      return res.status(404).json({ error: "Question not found." });

    const isCorrect = question.correctAnswer === userAnswer;
    const skill = question.Skill;

    await StudentAnswer.create({
      userId: userId,
      questionId: questionId,
      isCorrect: isCorrect,
    });

    let studentSkill = await StudentSkill.findOne({
      where: { userId, skillId: skill.id },
    });

    if (!studentSkill)
      return res
        .status(400)
        .json({ error: "Student progress not initialized." });

    if (!studentSkill.isMastered) {
      const updatedPL = calculateNewMastery(
        isCorrect,
        studentSkill.currentPL,
        skill.pT,
        skill.pG,
        skill.pS,
      );

      studentSkill.currentPL = updatedPL;

      if (studentSkill.currentPL >= skill.masteryThreshold) {
        studentSkill.isMastered = true;
      }
      await studentSkill.save();
    }

    res.status(200).json({
      isCorrect,
      correctAnswer: question.correctAnswer,
      currentPL: studentSkill.currentPL,
      isMastered: studentSkill.isMastered,
    });
  } catch (error) {
    console.error("Submit error:", error);
    res.status(500).json({ error: "Failed to grade question." });
  }
});

// --- FACULTY ASSIGNMENT ADDED ---
router.post("/admin/skill", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, pL0, pT, pG, pS, masteryThreshold } = req.body;

    if ([pL0, pT, pG, pS].some((val) => val < 0 || val > 1)) {
      return res
        .status(400)
        .json({ error: "BKT parameters must be between 0 and 1." });
    }

    const newSkill = await Skill.create({
      name,
      description,
      pL0: parseFloat(pL0) || 0.1,
      pT: parseFloat(pT) || 0.2,
      pG: parseFloat(pG) || 0.25,
      pS: parseFloat(pS) || 0.1,
      masteryThreshold: parseFloat(masteryThreshold) || 0.95,
      facultyId: req.user.id, // Assign to the logged-in teacher
    });

    res.status(201).json(newSkill);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create new skill." });
  }
});

// --- SKILL OWNERSHIP CHECK ADDED ---
router.post("/admin/question", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { skillId, text, options, correctAnswer } = req.body;

    const skillExists = await Skill.findOne({
      where: { id: skillId, facultyId: req.user.id },
    });
    if (!skillExists)
      return res
        .status(404)
        .json({ error: "Skill not found or unauthorized." });

    if (!Array.isArray(options) || !options.includes(correctAnswer)) {
      return res
        .status(400)
        .json({ error: "Correct answer must be included in options array." });
    }

    const newQuestion = await Question.create({
      skillId,
      text,
      options: JSON.stringify(options),
      correctAnswer,
    });

    res
      .status(201)
      .json({ message: "Question added successfully!", question: newQuestion });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add question." });
  }
});

// --- FACULTY FILTER ADDED ---
router.get("/admin/questions", verifyToken, requireAdmin, async (req, res) => {
  try {
    const questions = await Question.findAll({
      include: [
        {
          model: Skill,
          attributes: ["name"],
          where: { facultyId: req.user.id }, // Only fetch questions for this teacher's skills
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const formattedQuestions = questions.map((q) => ({
      id: q.id,
      skillId: q.skillId,
      skillName: q.Skill ? q.Skill.name : "Unknown Skill",
      text: q.text,
      options: JSON.parse(q.options),
      correctAnswer: q.correctAnswer,
    }));

    res.status(200).json(formattedQuestions);
  } catch (error) {
    console.error("Fetch questions error:", error);
    res.status(500).json({ error: "Failed to fetch questions." });
  }
});

router.put(
  "/admin/question/:id",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { skillId, text, options, correctAnswer } = req.body;

      const targetSkill = await Skill.findOne({
        where: { id: skillId, facultyId: req.user.id },
      });
      if (!targetSkill)
        return res
          .status(403)
          .json({ error: "Unauthorized skill assignment." });

      const question = await Question.findOne({
        where: { id },
        include: [{ model: Skill, where: { facultyId: req.user.id } }],
      });
      if (!question)
        return res
          .status(404)
          .json({ error: "Question not found or unauthorized." });

      question.skillId = skillId;
      question.text = text;
      question.options = JSON.stringify(options);
      question.correctAnswer = correctAnswer;

      await question.save();
      res.status(200).json({ message: "Question updated successfully!" });
    } catch (error) {
      console.error("Update question error:", error);
      res.status(500).json({ error: "Failed to update question." });
    }
  },
);

router.delete(
  "/admin/question/:id",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const question = await Question.findOne({
        where: { id },
        include: [{ model: Skill, where: { facultyId: req.user.id } }],
      });
      if (!question)
        return res
          .status(404)
          .json({ error: "Question not found or unauthorized." });

      await question.destroy();
      res.status(200).json({ message: "Question deleted successfully!" });
    } catch (error) {
      console.error("Delete question error:", error);
      res.status(500).json({ error: "Failed to delete question." });
    }
  },
);

// --- GENERATE QUIZ WITH GEMINI ---
router.post("/generate", verifyToken, async (req, res) => {
  const { lessonText, skills } = req.body;

  if (!lessonText || !skills) {
    return res.status(400).json({ error: "Missing lessonText or skills." });
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

    const prompt = `
      You are an expert educational content author. Analyze the following instructional lesson material and generate a rigorous baseline assessment quiz to test a student's preparedness before they are allowed to borrow equipment.

      Targeted Skills to assess: ${skills.join(", ")}

      Lesson Material:
      """
      ${lessonText}
      """

      CRITICAL INSTRUCTIONS:
      1. Generate exactly 10-15 questions per targeted skill listed above.
      2. Questions should synthesize the provided lesson material with standard, widely accepted knowledge of school laboratory essentials, equipment handling, and safety protocols.
      3. Make the questions challenging. Avoid simple factual recall. Instead, use scenario-based questions, troubleshooting situations, and practical application of concepts in a real lab setting.
      4. Provide exactly 4 plausible options for each question.
      5. Distractors must be highly realistic mistakes or dangerous misconceptions a student might actually make in a lab.
      6. Respond ONLY with a valid JSON array matching the schema below.

      JSON Schema:
      [
        {
          "questionText": "Question text?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswerIndex": 0,
          "targetedSkill": "Name of the skill from the requested list"
        }
      ]
    `;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text().trim();

    const jsonMatch = rawText.match(/\[\s*{[\s\S]*}\s*\]/);
    if (!jsonMatch) throw new Error("Invalid AI response");

    const questions = JSON.parse(jsonMatch[0]);

    res.status(200).json({ questions });
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    res.status(500).json({ error: "Failed to generate quiz." });
  }
});

// --- UPDATED ADMIN PASSERS: FILTERED BY ASSIGNED TEMPLATE SKILLS ---
router.get("/admin/passers", verifyToken, async (req, res) => {
  try {
    const facultyId = req.user.id;

    // 1. Get the sections handled by THIS teacher
    const handledSections = await FacultySection.findAll({
      where: { facultyId },
      attributes: ["year", "section"],
    });

    if (handledSections.length === 0) {
      return res.status(200).json([]);
    }

    const sectionConditions = handledSections.map((hs) => ({
      year: hs.year,
      section: hs.section,
    }));

    // Create string formats (e.g. "3rd Year - A") to match Assignments table
    const sectionStrings = handledSections.map(
      (hs) => `${hs.year} - ${hs.section}`,
    );

    // 2. Fetch ONLY students belonging to the teacher's sections
    const allStudents = await User.findAll({
      where: {
        role: "STUDENT",
        [Op.or]: sectionConditions,
      },
    });

    if (allStudents.length === 0) {
      return res.status(200).json([]);
    }

    // 3. Find Active Assignments for these sections to see which skills are actually REQUIRED
    const activeGateAssignments = await ExperimentAssignment.findAll({
      where: {
        yearAndSection: { [Op.in]: sectionStrings },
        activeSafetyGate: true, // Only fetch skills that are actively gating the students
      },
      include: [
        {
          model: ExperimentTemplate,
          as: "template",
          attributes: ["skillIds"],
        },
      ],
    });

    // 4. Extract and clean the skillIds from the templates
    const rawSkillIds = [];
    activeGateAssignments.forEach((assignment) => {
      let ids = assignment.template?.skillIds;
      if (typeof ids === "string") {
        try {
          ids = JSON.parse(ids);
        } catch (e) {
          ids = ids.split(",");
        }
      }
      if (Array.isArray(ids)) {
        rawSkillIds.push(...ids);
      }
    });

    const cleanSkillIds = [
      ...new Set(
        rawSkillIds
          .flat()
          .map((id) => parseInt(String(id).trim(), 10))
          .filter((id) => !isNaN(id)),
      ),
    ];

    // 5. Fetch ONLY the specific skills required by these assignments
    let requiredSkills = [];
    if (cleanSkillIds.length > 0) {
      requiredSkills = await Skill.findAll({
        where: { id: cleanSkillIds },
      });
    }

    // 6. EXACTLY YOUR OLD CODE FOR PROGRESS MAP
    const studentSkills = await StudentSkill.findAll();

    const progressMap = {};
    studentSkills.forEach((ss) => {
      if (!progressMap[ss.userId]) progressMap[ss.userId] = {};
      progressMap[ss.userId][ss.skillId] = ss.isMastered;
    });

    // 7. Format the data, injecting ONLY the requiredSkills
    const formattedData = allStudents.map((student) => {
      const studentProgress = progressMap[student.id] || {};

      const skillDetails = requiredSkills.map((skill) => ({
        id: skill.id,
        name: skill.name,
        isMastered: studentProgress[skill.id] || false,
      }));

      // Student is cleared if they have mastered ALL required skills
      const isCleared =
        skillDetails.length > 0 && skillDetails.every((s) => s.isMastered);

      return {
        id: student.id,
        studentName: student.name,
        email: student.email,
        section:
          `${student.year || ""} ${student.section || ""}`.trim() ||
          "Unassigned",
        isCleared,
        skills: skillDetails,
      };
    });

    formattedData.sort((a, b) =>
      a.isCleared === b.isCleared ? 0 : a.isCleared ? -1 : 1,
    );

    res.status(200).json(formattedData);
  } catch (error) {
    console.error("Fetch passers error:", error);
    res.status(500).json({ error: "Failed to fetch student status." });
  }
});

module.exports = router;
