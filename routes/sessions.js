const express = require("express");
const { LabSession, User, Subject } = require("../models");
const { verifyToken } = require("../middleware/authMiddleware");
const { Op } = require("sequelize");

const router = express.Router();

// POST: Book a new lab session
router.post("/book", verifyToken, async (req, res) => {
  try {
    const {
      section,
      subject,
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
      subjectId: subjectRecord.id, // <-- Save the subjectId to the database!
      section,
      experimentName,
      reservationDate,
      startTime,
      endTime,
      status: "PENDING",
    });

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
