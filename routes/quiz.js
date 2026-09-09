const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Op } = require("sequelize");
const {
  User,
  Skill,
  StudentSkill,
  Question,
  StudentAnswer,
  ExperimentAssignment,
  ExperimentTemplate,
  FacultySection,
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

    const { assignmentId } = req.query; 

    let activeGateAssignments = [];

    if (assignmentId) {
      // 1. Fetch specifically requested assignment
      const specificAssignment = await ExperimentAssignment.findOne({
        where: {
          id: assignmentId,
          yearAndSection: combinedYearSection,
        },
        include: [
          {
            model: ExperimentTemplate,
            as: "template",
            attributes: ["skillIds"],
          },
        ],
      });

      if (specificAssignment && specificAssignment.activeSafetyGate) {
        activeGateAssignments.push(specificAssignment);
      }
    } else {
      // 2. Global fetch (Fallback for your other components)
      activeGateAssignments = await ExperimentAssignment.findAll({
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
    }

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
      skills = await Skill.findAll({ where: { id: assignedSkillIds } });
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

    res.status(200).json({ progressData, requiresSafetyGate });
  } catch (error) {
    console.error("Progress fetch error:", error);
    res.status(500).json({ error: "Failed to fetch student progress." });
  }
});

router.get("/skills", verifyToken, async (req, res) => {
  try {
    const skills = await Skill.findAll({ where: { facultyId: req.user.id } });
    res.status(200).json(skills);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch skills." });
  }
});

// --- FIX 1: EXCLUDE ANSWERED QUESTIONS (WITH SIMPLE FALLBACK) ---
router.get("/question/:skillId", verifyToken, async (req, res) => {
  try {
    const { skillId } = req.params;
    const userId = req.user.id;

    // Find questions this user has already answered for this skill
    const userAnswers = await StudentAnswer.findAll({
      where: { userId },
      include: [{ model: Question, where: { skillId }, attributes: [] }],
      attributes: ["questionId"],
    });

    const answeredIds = userAnswers.map((a) => a.questionId);

    // Build the query to find unanswered questions
    const whereClause = { skillId: skillId };
    if (answeredIds.length > 0) {
      whereClause.id = { [Op.notIn]: answeredIds };
    }

    let questions = await Question.findAll({ where: whereClause });

    // Fallback: If they answered everything but haven't passed, just reset the pool
    if (questions.length === 0) {
      questions = await Question.findAll({ where: { skillId: skillId } });
    }

    if (questions.length === 0)
      return res.status(404).json({ error: "No questions found." });

    const randomQ = questions[Math.floor(Math.random() * questions.length)];

    res.status(200).json({
      id: randomQ.id,
      text: randomQ.text,
      options: JSON.parse(randomQ.options),
    });
  } catch (error) {
    console.error("Fetch question error:", error);
    res.status(500).json({ error: "Failed to fetch question." });
  }
});

// --- FIX 2: CONTINUOUS BKT UPDATES ---
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

    // Removed the "if (!studentSkill.isMastered)" block so math always runs
    const updatedPL = calculateNewMastery(
      isCorrect,
      studentSkill.currentPL,
      skill.pT,
      skill.pG,
      skill.pS,
    );

    studentSkill.currentPL = updatedPL;
    studentSkill.isMastered = studentSkill.currentPL >= skill.masteryThreshold;
    await studentSkill.save();

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

// ... [Admin routes /admin/skill, /admin/question, /admin/questions remain exactly the same] ...
router.post("/admin/skill", verifyToken, requireAdmin, async (req, res) => {
  // [Unchanged]
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
      facultyId: req.user.id,
    });
    res.status(201).json(newSkill);
  } catch (error) {
    res.status(500).json({ error: "Failed to create new skill." });
  }
});

router.post("/admin/question", verifyToken, requireAdmin, async (req, res) => {
  // [Unchanged]
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
    res.status(500).json({ error: "Failed to add question." });
  }
});

router.get("/admin/questions", verifyToken, requireAdmin, async (req, res) => {
  // [Unchanged]
  try {
    const questions = await Question.findAll({
      include: [
        {
          model: Skill,
          attributes: ["name"],
          where: { facultyId: req.user.id },
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
    res.status(500).json({ error: "Failed to fetch questions." });
  }
});

router.put(
  "/admin/question/:id",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    // [Unchanged]
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
      res.status(500).json({ error: "Failed to update question." });
    }
  },
);

router.delete(
  "/admin/question/:id",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    // [Unchanged]
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
      res.status(500).json({ error: "Failed to delete question." });
    }
  },
);

// --- FIX 3: DIRECT STRING GENERATION ---
router.post("/generate", verifyToken, async (req, res) => {
  const { lessonText } = req.body;
  if (!lessonText)
    return res.status(400).json({ error: "Missing lessonText." });

  try {
    const model = ai.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

    const prompt = `
      You are an expert educational data miner and instructional designer. 
      Analyze the following instructional lesson material for a laboratory experiment.
      
      Your task is to:
      1. Identify and extract 2 to 4 core "Skills" (learning objectives or safety protocols).
      2. Recommend BKT parameters (p_init, p_transit, p_slip, p_guess) between 0.01 and 0.99.
      3. Generate exactly 8-10 rigorous assessment questions PER SKILL.

      Lesson Material:
      """
      ${lessonText}
      """

      CRITICAL INSTRUCTIONS:
      - Questions must focus on pre-laboratory safety, practical application, or troubleshooting.
      - Provide exactly 4 plausible options.
      - Respond ONLY with a valid JSON object matching the schema below. 

      JSON Schema:
      {
        "skills": [
          {
            "name": "Specific Skill Name",
            "p_init": 0.25,
            "p_transit": 0.20,
            "p_slip": 0.10,
            "p_guess": 0.25
          }
        ],
        "questions": [
          {
            "questionText": "Question text?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswer": "Exact string of the correct option here", 
            "targetedSkill": "Specific Skill Name"
          }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text().trim();

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid AI response structure");

    const generatedData = JSON.parse(jsonMatch[0]);

    res.status(200).json({
      skills: generatedData.skills || [],
      questions: generatedData.questions || [],
    });
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    res.status(500).json({ error: "Failed to generate skills and quiz." });
  }
});

router.get("/admin/passers", verifyToken, async (req, res) => {
  // ... [Unchanged from your original code] ...
  try {
    const facultyId = req.user.id;
    const handledSections = await FacultySection.findAll({
      where: { facultyId },
      attributes: ["year", "section"],
    });
    if (handledSections.length === 0) return res.status(200).json([]);
    const sectionConditions = handledSections.map((hs) => ({
      year: hs.year,
      section: hs.section,
    }));
    const sectionStrings = handledSections.map(
      (hs) => `${hs.year} - ${hs.section}`,
    );
    const allStudents = await User.findAll({
      where: { role: "STUDENT", [Op.or]: sectionConditions },
    });
    if (allStudents.length === 0) return res.status(200).json([]);
    const activeGateAssignments = await ExperimentAssignment.findAll({
      where: {
        yearAndSection: { [Op.in]: sectionStrings },
        activeSafetyGate: true,
      },
      include: [
        { model: ExperimentTemplate, as: "template", attributes: ["skillIds"] },
      ],
    });
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
    let requiredSkills = [];
    if (cleanSkillIds.length > 0) {
      requiredSkills = await Skill.findAll({ where: { id: cleanSkillIds } });
    }
    const studentSkills = await StudentSkill.findAll();
    const progressMap = {};
    studentSkills.forEach((ss) => {
      if (!progressMap[ss.userId]) progressMap[ss.userId] = {};
      progressMap[ss.userId][ss.skillId] = ss.isMastered;
    });
    const formattedData = allStudents.map((student) => {
      const studentProgress = progressMap[student.id] || {};
      const skillDetails = requiredSkills.map((skill) => ({
        id: skill.id,
        name: skill.name,
        isMastered: studentProgress[skill.id] || false,
      }));
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
