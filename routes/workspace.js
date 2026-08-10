const express = require("express");
const crypto = require("crypto");
const { Op } = require("sequelize"); // <-- Added Op for the section filtering
const {
  LabGroup,
  User,
  ExperimentSubmission,
  ExperimentAssignment,
  ExperimentTemplate,
  GradingCriteria,
  FacultySection, // <-- Added FacultySection here
  sequelize,
} = require("../models");
const { verifyToken } = require("../middleware/authMiddleware");
const router = express.Router();
const lobbies = new Map();

router.get("/grading", verifyToken, async (req, res) => {
  try {
    // Extract groupId from the query string (e.g., /api/workspace/grading?groupId=12)
    const { groupId } = req.query;

    if (!groupId) {
      return res.status(400).json({ error: "Group ID is required." });
    }

    const groupToGrade = await LabGroup.findOne({
      where: { joinCode: groupId },
      include: [
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
        // Nested include to fetch the specific grading criteria
        {
          model: ExperimentAssignment,
          as: "assignment",
          include: [
            {
              model: ExperimentTemplate,
              as: "template",
              include: [
                {
                  model: GradingCriteria,
                  as: "criteria",
                },
              ],
            },
          ],
        },
      ],
    });

    if (!groupToGrade) {
      return res.status(404).json({ error: "Group not found." });
    }

    res.status(200).json(groupToGrade);
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
        grade: grade, // Since grade is JSON type in your DB, storing the float number works fine
        feedback: feedback,
      });
    } else {
      submission.grade = grade;
      submission.feedback = feedback;
      await submission.save();
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
      (hs) => `${hs.year} - ${hs.section}`
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