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
  PeerAssessment,
} = require("../models");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/student-deep-dive", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { skillId } = req.query;

    if (!skillId) {
      return res.status(400).json({ error: "skillId is required." });
    }

    // 1. Fetch User, Skill, and the actual StudentSkill record
    const user = await User.findByPk(userId);
    const skill = await Skill.findByPk(skillId);
    const studentSkill = await StudentSkill.findOne({
      where: { userId: userId, skillId: skillId },
    });

    if (!user || !skill) {
      return res.status(404).json({ error: "User or Skill not found." });
    }

    // 2. Fetch Student Answer History
    const answers = await StudentAnswer.findAll({
      where: { userId: userId },
      include: [
        {
          model: Question,
          where: { skillId: skillId },
          attributes: ["id", "text", "correctAnswer"],
        },
      ],
      order: [["createdAt", "ASC"]],
    });

    // 3. Calculate BKT progression
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

      if (isCorrect) {
        pLObs =
          (currentPL * (1 - skill.pS)) /
          (currentPL * (1 - skill.pS) + (1 - currentPL) * skill.pG);
      } else {
        pLObs =
          (currentPL * skill.pS) /
          (currentPL * skill.pS + (1 - currentPL) * (1 - skill.pG));
      }

      currentPL = pLObs + (1 - pLObs) * skill.pT;

      bktData.push({
        label: `Q${index + 1}`,
        probability: Math.round(currentPL * 100),
        isCorrect: isCorrect,
        questionText: ans.Question?.text || "Unknown Question",
        correctAnswer: ans.Question?.correctAnswer || "Unknown",
      });
    });

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

    // --- NEW: Fetch Peer Assessments ---
    const peerAssessments = await PeerAssessment.findAll({
      where: { evaluateeId: userId },
    });

    // Calculate the average rating based on the 1-5 scale
    const avgPeerRating = peerAssessments.length
      ? (
          peerAssessments.reduce((sum, pa) => sum + pa.rating, 0) /
          peerAssessments.length
        ).toFixed(1)
      : "N/A";
    //

    // 5. Send JSON Response
    res.status(200).json({
      student: {
        name: user.name,
        section: user.section || "No Section",
      },
      skill: {
        title: skill.name,
        isCleared: isCleared,
      },
      bktData: bktData,
      stats: {
        logbooksSubmitted: submissions.length,
        avgGrade: avgGrade,
        totalMaterialRequests: materialRequests.length,
        labSessionsParticipated: userGroups.length,
        avgPeerRating: avgPeerRating,
        recentMaterials: materialRequests.slice(0, 3).map((mr) => ({
          name: mr.inventory?.name || "Unknown Material",
          amount: mr.amountRequested,
          unit: mr.inventory?.unit || "units",
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

router.get("/student-radar-stats", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // ==========================================
    // 1. Calculate BKT Overall Performance (0-100)
    // Uses currentPL from StudentSkill (0.0 to 1.0 scale)
    // ==========================================
    const studentSkills = await StudentSkill.findAll({
      where: { userId: userId },
    });
    let bktScore = 0;

    if (studentSkills.length > 0) {
      const totalPL = studentSkills.reduce(
        (sum, skill) => sum + skill.currentPL,
        0,
      );
      const avgPL = totalPL / studentSkills.length;
      bktScore = Math.round(avgPL * 100);
    }

    // ==========================================
    // 2. Calculate Overall Average Grade (0-100)
    // Finds all groups the user was in, then gets the submission grades
    // ==========================================
    const userGroups = await GroupMember.findAll({ where: { userId: userId } });
    const groupIds = userGroups.map((g) => g.groupId);

    const submissions = await ExperimentSubmission.findAll({
      where: {
        groupId: { [Op.in]: groupIds },
        grade: { [Op.not]: null },
      },
    });

    let gradeScore = 0;
    if (submissions.length > 0) {
      const totalGrades = submissions.reduce((sum, sub) => sum + sub.grade, 0);
      gradeScore = Math.round(totalGrades / submissions.length);
    }

    // ==========================================
    // 3. Calculate Peer Average Assessment (0-100)
    // Uses the 1-5 rating scale from PeerAssessment
    // ==========================================
    const peerAssessments = await PeerAssessment.findAll({
      where: { evaluateeId: userId },
    });

    let peerScore = 0;
    let rawPeerAvg = 0;
    if (peerAssessments.length > 0) {
      const totalRating = peerAssessments.reduce(
        (sum, pa) => sum + pa.rating,
        0,
      );
      rawPeerAvg = totalRating / peerAssessments.length;

      // Convert 1-5 scale to 0-100%
      peerScore = Math.round((rawPeerAvg / 5) * 100);
    }

    // ==========================================
    // 4. Send formatted response
    // ==========================================
    res.status(200).json({
      chartData: {
        labels: ["Subject Mastery (BKT)", "Lab Grades", "Peer Evaluations"],
        datasets: [
          {
            label: "Performance Overview",
            data: [bktScore, gradeScore, peerScore],
            backgroundColor: "rgba(79, 70, 229, 0.2)",
            borderColor: "rgba(79, 70, 229, 1)",
            pointBackgroundColor: "rgba(79, 70, 229, 1)",
            pointBorderColor: "#fff",
            pointHoverBackgroundColor: "#fff",
            pointHoverBorderColor: "rgba(79, 70, 229, 1)",
            borderWidth: 2,
          },
        ],
      },
      rawStats: {
        bktAverage: bktScore,
        gradeAverage: gradeScore,
        peerAverage: rawPeerAvg.toFixed(1),
      },
    });
  } catch (error) {
    console.error("Radar Chart API Error:", error);
    res.status(500).json({ error: "Failed to fetch radar chart statistics." });
  }
});

module.exports = router;
