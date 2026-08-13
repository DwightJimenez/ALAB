const express = require("express");
const {
  User,
  ClassSession,
  LabSession,
  AttendanceRecord,
  FacultySection,
  Subject,
  sequelize,
} = require("../models");
const { Op } = require("sequelize");
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

// UPDATED: Now expects /:facultyId/:subject/:section
router.get("/:facultyId/:subject/:section", async (req, res) => {
  try {
    const { facultyId, subject, section } = req.params;

    // Splits "12 - STEM B" into "12" and "STEM B"
    const [year, sectionName] = section.split(" - ");

    // 1. Look up the FacultySection first (since it organizes the subjects)
    const facultySection = await FacultySection.findOne({
      where: { facultyId, year, section: sectionName },
    });

    if (!facultySection) {
      return res.status(404).json({ error: "Section not found" });
    }

    // 2. Look up the Subject strictly within this section
    const subjectRecord = await Subject.findOne({
      where: { name: subject, sectionId: facultySection.id },
    });

    if (!subjectRecord) {
      return res
        .status(404)
        .json({ error: "Subject not found in this section" });
    }
    const subjectId = subjectRecord.id;

    // 3. Fetch Students
    const students = await User.findAll({
      where: { year: year, section: sectionName, role: "STUDENT" },
      attributes: ["id", "name"],
      order: [["name", "ASC"]],
    });

    // 4. Fetch Class Sessions (Filtered by subjectId)
    const classSessions = await ClassSession.findAll({
      where: {
        facultyId: facultyId,
        subjectId: subjectId,
        year: year,
        section: sectionName,
      },
      attributes: ["id", "date"],
    });

    // 5. Fetch Lab Sessions (Filtered by subjectId)
    const labSessions = await LabSession.findAll({
      where: { facultyId: facultyId, subjectId: subjectId, section: section },
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

    // 6. Fetch Attendance Records
    const sessionIds = allSessions.map((s) => s.id);
    let records = [];
    if (sessionIds.length > 0) {
      records = await AttendanceRecord.findAll({
        where: { sessionId: sessionIds },
        attributes: ["studentId", "sessionId", "sessionType", "status"],
      });
    }

    // 7. Format Attendance for Frontend
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

// UPDATED: Now processes the subject sent from frontend
router.post("/sync", async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { facultyId, subject, section, sessions, attendance } = req.body;
    const sessionMap = {};
    const [year, sectionName] = section.split(" - ");

    // 1. Look up the FacultySection first
    const facultySection = await FacultySection.findOne({
      where: { facultyId, year, section: sectionName },
    });

    if (!facultySection) {
      throw new Error("Section not found");
    }

    // 2. Look up the Subject strictly within this section
    const subjectRecord = await Subject.findOne({
      where: { name: subject, sectionId: facultySection.id },
    });

    if (!subjectRecord) {
      throw new Error("Subject not found in this section");
    }
    const subjectId = subjectRecord.id;

    // --- NEW: 2.5 Identify and delete removed CLASS sessions ---
    // Get all incoming CLASS session IDs that already exist in the DB (ignore "s_..." temporary IDs)
    const incomingClassSessionIds = sessions
      .filter((s) => s.sessionType === "CLASS" && !String(s.id).startsWith("s_"))
      .map((s) => parseInt(s.id, 10));

    const classSessionWhere = {
      facultyId,
      subjectId,
      year,
      section: sectionName,
    };

    // If there are incoming class sessions, we only delete the ones NOT in this list.
    // If incomingClassSessionIds is empty, it means ALL class sessions were deleted.
    if (incomingClassSessionIds.length > 0) {
      classSessionWhere.id = { [Op.notIn]: incomingClassSessionIds };
    }

    // Find which sessions are about to be deleted to clean up attendance records
    const sessionsToDelete = await ClassSession.findAll({
      where: classSessionWhere,
      transaction: t,
    });

    if (sessionsToDelete.length > 0) {
      const sessionIdsToDelete = sessionsToDelete.map((s) => s.id);
      
      // Clean up attendance records for these deleted sessions first
      await AttendanceRecord.destroy({
        where: {
          sessionId: sessionIdsToDelete,
          sessionType: "CLASS",
        },
        transaction: t,
      });

      // Delete the actual class sessions
      await ClassSession.destroy({
        where: { id: sessionIdsToDelete },
        transaction: t,
      });
    }
    // -----------------------------------------------------------

    // 3. Process Sessions (Create or Update)
    for (const s of sessions) {
      const isLab = s.sessionType === "LAB";

      if (typeof s.id === "string" && s.id.startsWith("s_")) {
        // CREATE NEW SESSION
        if (isLab) {
          const newSession = await LabSession.create(
            {
              facultyId,
              subjectId,
              section: section, 
              reservationDate: s.date,
              experimentName: s.experimentName || "Ad-hoc Lab",
              startTime: "TBD",
              endTime: "TBD",
            },
            { transaction: t },
          );
          sessionMap[`LAB_${s.id}`] = { id: newSession.id, type: "LAB" };
        } else {
          const newSession = await ClassSession.create(
            { facultyId, subjectId, year, section: sectionName, date: s.date }, 
            { transaction: t },
          );
          sessionMap[`CLASS_${s.id}`] = { id: newSession.id, type: "CLASS" };
        }
      } else {
        // UPDATE EXISTING SESSION
        if (isLab) {
          await LabSession.update(
            { reservationDate: s.date },
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

   // 4. Process Attendance Records
    for (const [studentIdStr, sessionData] of Object.entries(attendance)) {
      // Skip invalid keys like "null", "undefined", or empty strings
      if (studentIdStr === "null" || studentIdStr === "undefined" || !studentIdStr) {
        continue;
      }

      // Convert to integer and validate
      const studentId = parseInt(studentIdStr, 10);
      if (isNaN(studentId)) {
        continue;
      }

      for (const [frontendSessionKey, status] of Object.entries(sessionData)) {
        const actualSession = sessionMap[frontendSessionKey];
        // If the session was deleted, it won't be in the map, so we skip it
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
