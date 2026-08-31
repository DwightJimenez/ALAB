const express = require("express");
const crypto = require("crypto");
const { Op } = require("sequelize");
const {
  LabGroup,
  User,
  ExperimentSubmission,
  ExperimentAssignment,
  ExperimentTemplate,
  FacultySection,
  PeerAssessment,
  sequelize,
} = require("../models"); // Removed GradingCriteria
const { verifyToken } = require("../middleware/authMiddleware");

// 1. IMPORT BOTH EMAIL AND SMS NOTIFICATION FUNCTIONS
const { sendGradeNotification, sendGradeSms } = require("../utils/emailService");

const router = express.Router();
const lobbies = new Map();

router.get("/grading", verifyToken, async (req, res) => {
  try {
    const { groupId } = req.query;
    if (!groupId)
      return res.status(400).json({ error: "Group ID is required." });

    const groupToGrade = await LabGroup.findOne({
      where: { joinCode: groupId },
      include: [
        { model: ExperimentSubmission, as: "submission" },
        {
          model: User,
          as: "members",
          attributes: ["id", "name", "email"],
          through: { attributes: ["role"] },
        },
        {
          model: ExperimentAssignment,
          as: "assignment",
          include: [
            {
              model: ExperimentTemplate,
              as: "template",
              // Since 'criteria' is likely a JSON column on ExperimentTemplate,
              // you don't need to 'include' it. Sequelize fetches it automatically.
            },
          ],
        },
      ],
    });

    if (!groupToGrade)
      return res.status(404).json({ error: "Group not found." });

    // Fetch Peer Assessments for this group
    const peerAssessments = await PeerAssessment.findAll({
      where: { groupId: groupToGrade.id },
    });

    // Convert Sequelize object to JSON and attach assessments
    const responseData = groupToGrade.toJSON();
    responseData.peerAssessments = peerAssessments;

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Fetch grading data error:", error);
    res.status(500).json({ error: "Failed to fetch submission data." });
  }
});

router.post("/grade", verifyToken, async (req, res) => {
  try {
    const { groupCode, grade, feedback, rubricScores } = req.body;

    if (!groupCode) {
      return res.status(400).json({ error: "Group Code is required." });
    }
    const group = await LabGroup.findOne({ where: { joinCode: groupCode } });

    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    // Use findOrCreate so teachers can grade early even if students haven't formally clicked "Submit"
    let submission = await ExperimentSubmission.findOne({
      where: { groupId: group.id },
    });

    if (!submission) {
      submission = await ExperimentSubmission.create({
        groupId: group.id,
        grade: grade, 
        feedback: feedback,
      });
    } else {
      submission.grade = grade;
      submission.feedback = feedback;
      await submission.save();
    }

    const groupWithMembers = await LabGroup.findByPk(group.id, {
      include: [
        {
          model: User,
          as: "members",
          // 2. Add phoneNumber to the fetched attributes
          attributes: ["id", "name", "email", "phoneNumber"], 
        },
        {
          model: ExperimentAssignment,
          as: "assignment",
          include: [
            {
              model: ExperimentTemplate,
              as: "template",
              attributes: ["title"],
            },
          ],
        },
      ],
    });

    const assignmentTitle =
      groupWithMembers?.assignment?.template?.title || "Lab activity";

    // 3. Map the recipients array to include the phone number
    const recipients = (groupWithMembers?.members || []).map((member) => ({
      email: member.email,
      name: member.name,
      phone: member.phoneNumber, 
    }));

    if (recipients.length) {
      const notificationData = {
        recipients,
        studentName: "Student",
        assignmentTitle,
        grade,
        feedback: feedback || "No additional feedback was provided.",
      };

      // 4. Send Email and SMS concurrently
      await Promise.all([
        sendGradeNotification(notificationData),
        sendGradeSms(notificationData)
      ]);
    }

    res.status(200).json({
      message: "Grade and feedback saved successfully!",
      submission,
    });
  } catch (error) {
    console.error("Grading error:", error);
    res.status(500).json({ error: "Failed to save grade." });
  }
});

router.get("/directory", verifyToken, async (req, res) => {
  try {
    const facultyId = req.user.id;

    // 1. Find the year and sections this teacher handles
    const handledSections = await FacultySection.findAll({
      where: { facultyId },
      attributes: ["year", "section"],
    });

    if (handledSections.length === 0) {
      return res.status(200).json([]); // Teacher has no classes, return empty array
    }

    // 2. Build the exact match array (e.g., ["2024 - STEM A", "2024 - STEM B"])
    const sectionStrings = handledSections.map(
      (hs) => `${hs.year} - ${hs.section}`,
    );

    // 3. Fetch LabGroups joined to Assignments that match the teacher's sections
    const groups = await LabGroup.findAll({
      include: [
        {
          model: ExperimentAssignment,
          as: "assignment",
          where: {
            yearAndSection: {
              [Op.in]: sectionStrings, // <-- The teacher authorization filter
            },
          },
          include: [
            {
              model: ExperimentTemplate,
              as: "template",
              attributes: ["title"], // Need the title to display in the directory table
            },
          ],
        },
        {
          model: ExperimentSubmission,
          as: "submission",
        },
        {
          model: User,
          as: "members",
          attributes: ["id", "name", "email"],
          through: { attributes: ["role"] },
        },
      ],
      order: [["id", "DESC"]],
    });

    res.status(200).json(groups);
  } catch (error) {
    console.error("Fetch directory error:", error);
    res.status(500).json({ error: "Failed to fetch groups directory." });
  }
});

module.exports = router;