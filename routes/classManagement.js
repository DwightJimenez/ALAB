const express = require("express");
const {
  User,
  ClassSession,
  LabSession,
  AttendanceRecord,
  FacultySection,
  sequelize,
} = require("../models");
const router = express.Router();

router.get("/available-sections/:facultyId", async (req, res) => {
  try {
    const { facultyId } = req.params;

    const sections = await FacultySection.findAll({
      where: { facultyId: facultyId },
      attributes: ["year", "section"],
    });

    const formattedSections = sections.map((s) => `${s.year} - ${s.section}`);

    res.status(200).json(formattedSections);
  } catch (error) {
    console.error("Fetch section error:", error);
    res.status(500).json({ error: "Failed to load section data" });
  }
});

router.get("/:facultyId/:section", async (req, res) => {
  try {
    const { facultyId, section } = req.params;

    // Splits "12 - STEM B" into "12" and "STEM B" for the User and ClassSession tables
    const [year, sectionName] = section.split(" - ");

    // 1. Fetch Students
    const students = await User.findAll({
      where: { year: year, section: sectionName, role: "STUDENT" },
      attributes: ["id", "name"],
      order: [["name", "ASC"]],
    });

    // 2. Fetch Class Sessions
    const classSessions = await ClassSession.findAll({
      where: { facultyId: facultyId, year: year, section: sectionName },
      attributes: ["id", "date"],
    });

    // 3. Fetch Lab Sessions
    // FIX: Used 'section' instead of 'sectionName' because LabSessions saves the full "12 - STEM B" string
    const labSessions = await LabSession.findAll({
      where: { facultyId: facultyId, section: section },
      attributes: ["id", "reservationDate", "experimentName"],
    });

    // Format and combine both session types
    const formattedClassSessions = classSessions.map((s) => ({
      ...s.toJSON(),
      sessionType: "CLASS",
    }));

    const formattedLabSessions = labSessions.map((s) => ({
      id: s.id,
      date: s.reservationDate,
      experimentName: s.experimentName,
      sessionType: "LAB",
    }));

    // Merge and sort them chronologically by date
    const allSessions = [
      ...formattedClassSessions,
      ...formattedLabSessions,
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    // 4. Fetch Attendance Records
    const sessionIds = allSessions.map((s) => s.id);
    let records = [];
    if (sessionIds.length > 0) {
      records = await AttendanceRecord.findAll({
        where: { sessionId: sessionIds },
        attributes: ["studentId", "sessionId", "sessionType", "status"],
      });
    }

    // 5. Format Attendance for Frontend
    const formattedAttendance = {};
    records.forEach((record) => {
      if (!formattedAttendance[record.studentId]) {
        formattedAttendance[record.studentId] = {};
      }
      const uniqueSessionKey = `${record.sessionType}_${record.sessionId}`;
      formattedAttendance[record.studentId][uniqueSessionKey] = record.status;
    });

    res.status(200).json({
      students,
      sessions: allSessions,
      attendance: formattedAttendance,
    });
  } catch (error) {
    console.error("Fetch attendance error:", error);
    res.status(500).json({ error: "Failed to load attendance data" });
  }
});

router.post("/sync", async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { facultyId, section, sessions, attendance } = req.body;
    const sessionMap = {};
    const [year, sectionName] = section.split(" - ");

    // 1. Process Sessions (Create or Update)
    for (const s of sessions) {
      const isLab = s.sessionType === "LAB";

      if (typeof s.id === "string" && s.id.startsWith("s_")) {
        // CREATE NEW SESSION
        if (isLab) {
          const newSession = await LabSession.create(
            {
              facultyId,
              section: sectionName,
              reservationDate: s.date, // <-- Map frontend date to DB reservationDate
              experimentName: s.experimentName || "Ad-hoc Lab", // Fallback if created from attendance grid
              startTime: "TBD", // LabSession requires these, provide defaults
              endTime: "TBD",
            },
            { transaction: t },
          );
          sessionMap[`LAB_${s.id}`] = { id: newSession.id, type: "LAB" };
        } else {
          const newSession = await ClassSession.create(
            { facultyId, year, section: sectionName, date: s.date },
            { transaction: t },
          );
          sessionMap[`CLASS_${s.id}`] = { id: newSession.id, type: "CLASS" };
        }
      } else {
        // UPDATE EXISTING SESSION
        if (isLab) {
          await LabSession.update(
            { reservationDate: s.date }, // <-- Map frontend date to DB reservationDate
            { where: { id: s.id, facultyId }, transaction: t },
          );
          sessionMap[`LAB_${s.id}`] = { id: s.id, type: "LAB" };
        } else {
          await ClassSession.update(
            { date: s.date },
            { where: { id: s.id, facultyId }, transaction: t },
          );
          sessionMap[`CLASS_${s.id}`] = { id: s.id, type: "CLASS" };
        }
      }
    }

    // 2. Process Attendance Records
    for (const [studentId, sessionData] of Object.entries(attendance)) {
      for (const [frontendSessionKey, status] of Object.entries(sessionData)) {
        const actualSession = sessionMap[frontendSessionKey];
        if (!actualSession) continue;

        if (status === "P" || status === "A" || status === "L") {
          const [record, created] = await AttendanceRecord.findOrCreate({
            where: {
              sessionId: actualSession.id,
              studentId: studentId,
              sessionType: actualSession.type,
            },
            defaults: { status },
            transaction: t,
          });

          if (!created && record.status !== status) {
            await record.update({ status }, { transaction: t });
          }
        } else {
          await AttendanceRecord.destroy({
            where: {
              sessionId: actualSession.id,
              studentId: studentId,
              sessionType: actualSession.type,
            },
            transaction: t,
          });
        }
      }
    }

    await t.commit();
    res.status(200).json({ message: "Attendance synchronized successfully!" });
  } catch (error) {
    await t.rollback();
    console.error("Sync attendance error:", error);
    res.status(500).json({ error: "Failed to save attendance" });
  }
});

module.exports = router;
