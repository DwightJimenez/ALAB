const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const {
  User,
  Skill,
  StudentSkill,
  Question,
  StudentAnswer,
  ExperimentAssignment,
} = require("../models");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");
const { calculateNewMastery } = require("../utils/bkt");

const router = express.Router();
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- 1. GET STUDENT PROGRESS FOR DASHBOARD ---
router.get("/progress", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId);

    const combinedYearSection = `${user.year} - ${user.section}`;
    console.log("Looking for assignment with string:", combinedYearSection);

    const activeGateAssignment = await ExperimentAssignment.findOne({
      where: {
        yearAndSection: combinedYearSection,
        activeSafetyGate: true,
      },
    });

    const requiresSafetyGate = activeGateAssignment !== null;

    const skills = await Skill.findAll();

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

// --- GET ALL SKILLS (For Admin Dropdowns & General Use) ---
router.get("/skills", verifyToken, async (req, res) => {
  try {
    const skills = await Skill.findAll();
    res.status(200).json(skills);
  } catch (error) {
    console.error("Skills fetch error:", error);
    res.status(500).json({ error: "Failed to fetch skills." });
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
      1. Generate exactly 2-3 questions per targeted skill listed above.
      2. Every question must be directly answerable using only the facts provided in the lesson material.
      3. Provide exactly 4 plausible options for each question.
      4. Distractors must be realistic mistakes a student would make.
      5. Respond ONLY with a valid JSON array matching the schema below. No markdown, no extra text.

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

    // Parse the JSON directly
    const jsonMatch = rawText.match(/\[\s*{[\s\S]*}\s*\]/);
    if (!jsonMatch) throw new Error("Invalid AI response");

    const questions = JSON.parse(jsonMatch[0]);

    res.status(200).json({ questions });
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    res.status(500).json({ error: "Failed to generate quiz." });
  }
});

module.exports = router;
