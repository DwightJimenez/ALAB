const express = require("express");
const { Op } = require("sequelize");
const {
  User,
  Skill,
  Question,
  StudentAnswer,
  MaterialRequest,
  Inventory,
  GroupMember,
  ExperimentSubmission,
  StudentSkill,
} = require("../models");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/student-deep-dive", verifyToken, async (req, res) => {
  try {
    // Securely get the user ID from the verified token
    const userId = req.user.id;
    // Extract only skillId from the query string (e.g., ?skillId=2)
    const { skillId } = req.query;

    if (!skillId) {
      return res
        .status(400)
        .json({ error: "skillId is required." });
    }

    // 1. Fetch User, Skill, and the actual StudentSkill record from the DB
    const user = await User.findByPk(userId);
    const skill = await Skill.findByPk(skillId);
    
    // FETCH DATA ON THE DB: Get the exact StudentSkill record
    const studentSkill = await StudentSkill.findOne({
      where: { userId: userId, skillId: skillId }
    });

    if (!user || !skill) {
      return res.status(404).json({ error: "User or Skill not found." });
    }

    // 2. Fetch Student Answer History for this specific Skill chronologically
    const answers = await StudentAnswer.findAll({
      where: { userId: userId },
      include: [
        {
          model: Question,
          where: { skillId: skillId },
          // UPDATED: Added text and correctAnswer to attributes
          attributes: ["id", "text", "correctAnswer"],
        },
      ],
      order: [["createdAt", "ASC"]],
    });

    // 3. Calculate BKT (Bayesian Knowledge Tracing) progression ONLY for the chart points
    let currentPL = skill.pL0;
    const bktData = [
      {
        label: "Start",
        probability: Math.round(currentPL * 100),
        isCorrect: null,
      },
    ];

    answers.forEach((ans, index) => {
      const isCorrect = ans.isCorrect;
      let pLObs;

      // Update Probability based on Evidence (Correct or Incorrect)
      if (isCorrect) {
        pLObs =
          (currentPL * (1 - skill.pS)) /
          (currentPL * (1 - skill.pS) + (1 - currentPL) * skill.pG);
      } else {
        pLObs =
          (currentPL * skill.pS) /
          (currentPL * skill.pS + (1 - currentPL) * (1 - skill.pG));
      }

      // Apply Learning Rate for next state
      currentPL = pLObs + (1 - pLObs) * skill.pT;

      bktData.push({
        label: `Q${index + 1}`,
        probability: Math.round(currentPL * 100),
        isCorrect: isCorrect,
        // UPDATED: Passing the question text and correct answer to the frontend
        questionText: ans.Question?.text || "Unknown Question",
        correctAnswer: ans.Question?.correctAnswer || "Unknown",
      });
    });

    // FETCH DATA ON THE DB: Use the actual saved isMastered state
    const isCleared = studentSkill ? studentSkill.isMastered : false;

    // 4. Fetch System Activity & Stats
    const userGroups = await GroupMember.findAll({ where: { userId: userId } });
    const groupIds = userGroups.map((g) => g.groupId);

    const submissions = await ExperimentSubmission.findAll({
      where: {
        groupId: { [Op.in]: groupIds },
        grade: { [Op.not]: null },
      },
    });

    const avgGrade = submissions.length
      ? (
          submissions.reduce((sum, sub) => sum + sub.grade, 0) /
          submissions.length
        ).toFixed(1)
      : 0;

    const materialRequests = await MaterialRequest.findAll({
      where: { studentId: userId },
      include: [
        { model: Inventory, as: "inventory", attributes: ["name", "unit"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    // 5. Send JSON Response
    res.status(200).json({
      student: {
        name: user.name,
        section: user.section || "No Section",
      },
      skill: {
        title: skill.name,
        isCleared: isCleared, // Direct from the DB record
      },
      bktData: bktData,
      stats: {
        logbooksSubmitted: submissions.length,
        avgGrade: avgGrade,
        totalMaterialRequests: materialRequests.length,
        labSessionsParticipated: userGroups.length,
        recentMaterials: materialRequests.slice(0, 3).map((mr) => ({
          name: mr.inventory.name,
          amount: mr.amountRequested,
          unit: mr.inventory.unit,
          status: mr.status,
        })),
      },
    });
  } catch (error) {
    console.error("Deep Dive API Error:", error);
    res.status(500).json({ error: "Failed to fetch student analytics." });
  }
});

router.get("/student-skills", verifyToken, async (req, res) => {
  try {
    // Securely get the user ID from the verified token
    const userId = req.user.id;

    // Fetch the skills the student has interacted with via StudentSkill junction table
    const studentSkills = await StudentSkill.findAll({
      where: { userId: userId },
      include: [
        {
          model: Skill,
          attributes: ["id", "name", "description"],
        },
      ],
    });

    // Format the response for the frontend dropdown
    const formattedSkills = studentSkills.map((ss) => ({
      id: ss.Skill.id,
      name: ss.Skill.name,
      description: ss.Skill.description,
      currentPL: ss.currentPL,
      isMastered: ss.isMastered,
    }));

    res.status(200).json(formattedSkills);
  } catch (error) {
    console.error("Student Skills API Error:", error);
    res.status(500).json({ error: "Failed to fetch student skills." });
  }
});

module.exports = router;