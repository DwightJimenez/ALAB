const express = require("express");
const {
  User,
  Skill,
  StudentSkill,
  Question,
  StudentAnswer,
} = require("../models");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");
const { calculateNewMastery } = require("../utils/bkt");

const router = express.Router();

// --- 1. GET STUDENT PROGRESS FOR DASHBOARD ---
router.get("/progress", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const skills = await Skill.findAll();

    const progressData = await Promise.all(
      skills.map(async (skill) => {
        const [studentSkill] = await StudentSkill.findOrCreate({
          where: { userId, skillId: skill.id },
          defaults: { currentPL: skill.pL0, isMastered: false },
        });

        // NEW: Check if there are any questions for this skill
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
          hasQuestions: questionCount > 0, // True if questions exist
        };
      }),
    );

    res.status(200).json(progressData);
  } catch (error) {
    console.error("Progress fetch error:", error);
    res.status(500).json({ error: "Failed to fetch student progress." });
  }
});

// --- 2. GET A REAL QUESTION ---
router.get("/question/:skillId", verifyToken, async (req, res) => {
  try {
    const questions = await Question.findAll({
      where: { skillId: req.params.skillId },
    });
    if (questions.length === 0)
      return res.status(404).json({ error: "No questions found." });

    // Pick a random question from the pool
    const randomQ = questions[Math.floor(Math.random() * questions.length)];

    // Send it to React (DO NOT send the correctAnswer to the frontend to prevent cheating)
    res.status(200).json({
      id: randomQ.id,
      text: randomQ.text,
      options: JSON.parse(randomQ.options), // Convert JSON string back to Array
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch question." });
  }
});

// --- 3. GRADE THE ANSWER & UPDATE BKT ---
router.post("/submit", verifyToken, async (req, res) => {
  try {
    const { questionId, userAnswer } = req.body;
    const userId = req.user.id;

    // 1. Look up the question
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

    // 2. Fetch student progress
    let studentSkill = await StudentSkill.findOne({
      where: { userId, skillId: skill.id },
    });

    if (!studentSkill)
      return res
        .status(400)
        .json({ error: "Student progress not initialized." });

    // 3. Run the BKT Math (Only if they haven't mastered it yet)
    if (!studentSkill.isMastered) {
      const updatedPL = calculateNewMastery(
        isCorrect,
        studentSkill.currentPL,
        skill.pT,
        skill.pG,
        skill.pS,
      );

      studentSkill.currentPL = updatedPL;

      // Check if they crossed the threshold
      if (studentSkill.currentPL >= skill.masteryThreshold) {
        studentSkill.isMastered = true;
      }
      await studentSkill.save();
    }

    // 4. Send the feedback to React
    res.status(200).json({
      isCorrect,
      correctAnswer: question.correctAnswer, // Reveal the answer now
      currentPL: studentSkill.currentPL,
      isMastered: studentSkill.isMastered,
    });
  } catch (error) {
    console.error("Submit error:", error);
    res.status(500).json({ error: "Failed to grade question." });
  }
});

// ==========================================
// FACULTY / ADMIN ROUTES FOR BKT MANAGEMENT
// ==========================================

router.post("/admin/skill", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, pL0, pT, pG, pS, masteryThreshold } = req.body;

    // Validation: Ensure BKT parameters are valid probabilities (0 to 1)
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
    });

    res.status(201).json(newSkill);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create new skill." });
  }
});

// 2. Add a New Question to a Specific Skill
// Now protected by requireAdmin
router.post("/admin/question", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { skillId, text, options, correctAnswer } = req.body;

    // Validation: Ensure skill exists
    const skillExists = await Skill.findByPk(skillId);
    if (!skillExists)
      return res.status(404).json({ error: "Skill not found." });

    // Validation: Options check
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

module.exports = router;
