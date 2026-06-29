const express = require('express');
const { User, Skill, StudentSkill, Question } = require('../models');
const { verifyToken } = require('../middleware/authMiddleware');
const { calculateNewMastery } = require('../utils/bkt'); 

const router = express.Router();

// --- GET A REAL QUESTION ---
router.get('/question/:skillId', verifyToken, async (req, res) => {
  try {
    // Fetch all questions for this skill
    const questions = await Question.findAll({ where: { skillId: req.params.skillId } });
    if (questions.length === 0) return res.status(404).json({ error: "No questions found." });

    // Pick a random question
    const randomQ = questions[Math.floor(Math.random() * questions.length)];
    
    // Send it to React (Notice we DO NOT send the correctAnswer to the frontend!)
    res.status(200).json({
      id: randomQ.id,
      text: randomQ.text,
      options: JSON.parse(randomQ.options) // Convert back to an array
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch question." });
  }
});

// --- GRADE THE ANSWER & UPDATE BKT ---
router.post('/submit', verifyToken, async (req, res) => {
  try {
    const { questionId, userAnswer } = req.body; // Real data from the student
    const userId = req.user.id;

    // 1. Look up the question to grade it
    const question = await Question.findByPk(questionId, { include: Skill });
    if (!question) return res.status(404).json({ error: "Question not found." });

    const isCorrect = (question.correctAnswer === userAnswer);
    const skill = question.Skill;

    // 2. Fetch/Create student progress
    let [studentSkill] = await StudentSkill.findOrCreate({
      where: { userId, skillId: skill.id },
      defaults: { currentPL: skill.pL0, isMastered: false }
    });

    // 3. Run the BKT Math
    if (!studentSkill.isMastered) {
      const updatedPL = calculateNewMastery(
        isCorrect, studentSkill.currentPL, skill.pT, skill.pG, skill.pS
      );
      
      studentSkill.currentPL = updatedPL;
      if (studentSkill.currentPL >= skill.masteryThreshold) {
        studentSkill.isMastered = true;
      }
      await studentSkill.save();
    }

    // 4. Send the result back to React so the student knows how they did
    res.status(200).json({
      isCorrect,
      correctAnswer: question.correctAnswer, // Now we reveal it!
      currentPL: studentSkill.currentPL,
      isMastered: studentSkill.isMastered
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to grade question." });
  }
});

// ... (Keep your /progress route exactly the same) ...
module.exports = router;