const express = require("express");
// 1. Added ExperimentAssignment and LabGroup to imports
const {
  LabSession,
  User,
  Subject,
  ExperimentAssignment,
  LabGroup,
} = require("../models");
const { verifyToken } = require("../middleware/authMiddleware");
const { Op } = require("sequelize");

const router = express.Router();

// POST: Book a new lab session
router.post("/book", verifyToken, async (req, res) => {
  try {
    const {
      section,
      subject,
      experimentId, // 2. Extracted experimentId from the frontend payload
      experimentName,
      reservationDate,
      startTime,
      endTime,
    } = req.body;

    const subjectRecord = await Subject.findOne({ where: { name: subject } });
    if (!subjectRecord) {
      return res.status(404).json({ error: "Selected subject not found." });
    }

    const existingSession = await LabSession.findOne({
      where: {
        reservationDate,
        startTime,
        status: {
          [Op.in]: ["PENDING", "APPROVED"],
        },
      },
    });

    if (existingSession) {
      return res.status(400).json({
        error:
          "This time slot is already occupied. Please select an available time.",
      });
    }

    // 3. Create the session and attach the subjectId
    const newSession = await LabSession.create({
      facultyId: req.user.id,
      subjectId: subjectRecord.id,
      section,
      experimentName,
      reservationDate,
      startTime,
      endTime,
      status: "PENDING",
    });

    // 4. NEW LOGIC: Link existing LabGroups to this new LabSession
    if (experimentId) {
      const assignment = await ExperimentAssignment.findOne({
        where: {
          templateId: experimentId,
          yearAndSection: section,
        },
      });

      if (assignment) {
        await LabGroup.update(
          { labSessionId: newSession.id },
          { where: { assignmentId: assignment.id } },
        );
      }
    }

    res.status(201).json({
      message: "Lab session requested successfully!",
      session: newSession,
    });
  } catch (error) {
    console.error("Booking failed:", error);
    res.status(500).json({ error: "Failed to book laboratory session." });
  }
});

// GET: Fetch all lab sessions (for the calendar viewer)
router.get("/", verifyToken, async (req, res) => {
  try {
    const sessions = await LabSession.findAll({
      include: [
        { model: User, as: "faculty", attributes: ["name"] },
        { model: Subject, as: "subject", attributes: ["name"] },
      ],
      order: [
        ["reservationDate", "ASC"],
        ["startTime", "ASC"],
      ],
    });

    res.status(200).json(sessions);
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    res.status(500).json({ error: "Failed to load laboratory sessions." });
  }
});

// GET: Fetch the active lab session for a specific section
router.get("/active/:section", verifyToken, async (req, res) => {
  try {
    const { section } = req.params;

    // Find ANY approved session for this section, regardless of the date
    const activeSession = await LabSession.findOne({
      where: {
        section: section, // Matches the yearAndSection from frontend
        status: "APPROVED", // Change this to "IN_PROGRESS" if you use manual start buttons
      },
      // Order by date descending to grab the most recently scheduled session.
      // (Change to "ASC" if you want the oldest/earliest scheduled one instead).
      order: [
        ["reservationDate", "DESC"],
        ["startTime", "DESC"],
      ],
      include: [
        { model: User, as: "faculty", attributes: ["name"] },
        { model: Subject, as: "subject", attributes: ["name"] },
      ],
    });

    if (!activeSession) {
      // Return null so the frontend knows to lock the workspace
      return res.status(200).json(null);
    }

    res.status(200).json(activeSession);
  } catch (error) {
    console.error("Failed to fetch active session:", error);
    res
      .status(500)
      .json({ error: "Failed to load active laboratory session." });
  }
});

// PUT: Approve a lab session
router.put("/:id/approve", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const session = await LabSession.findByPk(id);
    if (!session) {
      return res.status(404).json({ error: "Lab session not found." });
    }

    session.status = "APPROVED";
    await session.save();

    res.status(200).json({ message: "Lab session approved successfully!" });
  } catch (error) {
    console.error("Failed to approve session:", error);
    res.status(500).json({ error: "Failed to approve session." });
  }
});

// PUT: Reject a lab session
router.put("/:id/reject", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const session = await LabSession.findByPk(id);
    if (!session) {
      return res.status(404).json({ error: "Lab session not found." });
    }

    session.status = "REJECTED";
    await session.save();

    res.status(200).json({ message: "Lab session rejected successfully!" });
  } catch (error) {
    console.error("Failed to reject session:", error);
    res.status(500).json({ error: "Failed to reject session." });
  }
});

module.exports = router;
