const express = require("express");
const { 
  User, 
  AttendanceRecord, 
  ClassSession, 
  LabSession,
  Subject,
  ExperimentTemplate,
  ExperimentAssignment,
  LabGroup,
  ExperimentSubmission,
  CustomAssessment
} = require("../models");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// GET: Fetch attendance records, summaries, lab averages, and custom scores
router.get("/:facultyId/:subject/:section", verifyToken, async (req, res) => {
  try {
    const { facultyId, subject, section } = req.params;

    // 1. Look up Subject ID
    const subjectRecord = await Subject.findOne({ where: { name: subject } });
    if (!subjectRecord) {
      return res.status(404).json({ error: "Subject not found" });
    }
    const subjectId = subjectRecord.id;

    // 2. Safely parse section for Student/Session queries
    let year, sectionName;
    if (section.includes(" - ")) {
      [year, sectionName] = section.split(" - ");
    } else {
      sectionName = section;
    }

    // 3. Fetch students
    const students = await User.findAll({
      where: { 
        role: "STUDENT",
        ...(year ? { year } : {}),
        section: sectionName,
      },
      attributes: ["id", "name", "email", "avatar"],
      order: [["name", "ASC"]],
    });

    if (!students || students.length === 0) {
      return res.status(200).json({ students: [], customAssessments: [], totalSessions: 0 });
    }

    const studentIds = students.map((s) => s.id);

    // 4. Fetch Sessions for Attendance
    const classSessions = await ClassSession.findAll({
      where: { facultyId, subjectId, ...(year ? { year } : {}), section: sectionName },
      attributes: ["id"]
    });
    const labSessions = await LabSession.findAll({
      where: { facultyId, subjectId, section },
      attributes: ["id"]
    });

    const sessionIds = [
      ...classSessions.map(s => s.id),
      ...labSessions.map(s => s.id)
    ];

    // 5. Fetch Attendance records
    const attendanceRecords = sessionIds.length > 0 ? await AttendanceRecord.findAll({
      where: { sessionId: sessionIds, studentId: studentIds },
      attributes: ["studentId", "status"],
    }) : [];

    // 6. Fetch Lab Submissions for Lab Average
    const templates = await ExperimentTemplate.findAll({
      where: { subjectId },
      attributes: ["id"]
    });
    const templateIds = templates.map(t => t.id);

    const labAvgMap = {};
    if (templateIds.length > 0) {
      const assignments = await ExperimentAssignment.findAll({
        where: { templateId: templateIds, yearAndSection: section },
        attributes: ["id"]
      });
      const assignmentIds = assignments.map(a => a.id);

      if (assignmentIds.length > 0) {
        const labGroups = await LabGroup.findAll({
          where: { assignmentId: assignmentIds },
          include: [
            { model: ExperimentSubmission, as: "submission", attributes: ["grade"] },
            { model: User, as: "members", attributes: ["id"], through: { attributes: [] } }
          ]
        });

        const studentGrades = {}; 
        labGroups.forEach(group => {
          if (group.submission && group.submission.grade !== null && group.submission.grade !== undefined) {
            group.members.forEach(member => {
              if (!studentGrades[member.id]) studentGrades[member.id] = [];
              studentGrades[member.id].push(group.submission.grade);
            });
          }
        });

        studentIds.forEach(id => {
          if (studentGrades[id] && studentGrades[id].length > 0) {
            const sum = studentGrades[id].reduce((a, b) => a + parseFloat(b), 0);
            labAvgMap[id] = parseFloat((sum / studentGrades[id].length).toFixed(2));
          }
        });
      }
    }

    // 7. Fetch Custom Assessments (Includes category and JSON 'scores' column)
    const customAssessments = await CustomAssessment.findAll({
      where: { facultyId, subjectId, section: section },
      attributes: ["id", "name", "maxScore", "category", "scores"],
      order: [["createdAt", "ASC"]]
    });

    // 8. Compute Summary per student
    const formattedStudents = students.map((student) => {
      const studentRecords = attendanceRecords.filter(r => r.studentId === student.id);
      const totalSessions = sessionIds.length;
      
      let presentCount = 0;
      let lateCount = 0;
      let absentCount = 0;
      let percentage = 100.00;

      if (totalSessions > 0) {
        presentCount = studentRecords.filter(r => r.status === "P").length;
        lateCount = studentRecords.filter(r => r.status === "L").length;
        absentCount = studentRecords.filter(r => r.status === "A").length;
        
        const attendedCount = presentCount + lateCount;
        percentage = parseFloat(((attendedCount / totalSessions) * 100).toFixed(2));
      }

      // Extract custom scores from the JSON column for this specific student
      const studentCustomScores = {};
      customAssessments.forEach(assessment => {
        if (assessment.scores && assessment.scores[student.id] !== undefined) {
          studentCustomScores[assessment.id] = assessment.scores[student.id];
        }
      });

      return {
        id: student.id,
        name: student.name,
        totalSessions,
        presentCount,
        lateCount,
        absentCount,
        attendancePercentage: percentage,
        labAvg: labAvgMap[student.id] !== undefined ? labAvgMap[student.id] : null,
        customScores: studentCustomScores
      };
    });

    const frontendColumns = customAssessments.map(a => ({
      id: a.id,
      name: a.name,
      maxScore: a.maxScore,
      category: a.category || "Written Work"
    }));

    res.status(200).json({ 
      students: formattedStudents, 
      customAssessments: frontendColumns,
      totalSessions: sessionIds.length 
    });
  } catch (error) {
    console.error("Fetch attendance class records error:", error);
    res.status(500).json({ error: "Failed to load class record data" });
  }
});

// POST: Add a new custom assessment column
router.post("/custom-assessment", verifyToken, async (req, res) => {
  try {
    const { facultyId, subject, section, name, maxScore, category } = req.body;
    
    const subjectRecord = await Subject.findOne({ where: { name: subject } });
    if (!subjectRecord) {
      return res.status(404).json({ error: "Subject not found" });
    }

    const newAssessment = await CustomAssessment.create({
      facultyId,
      subjectId: subjectRecord.id,
      section: section, 
      name,
      maxScore: maxScore || 100,
      category: category || "Written Work",
      scores: {}
    });
    
    res.status(201).json(newAssessment);
  } catch (error) {
    console.error("Error creating assessment column:", error);
    res.status(500).json({ error: "Failed to create column" });
  }
});

// DELETE: Remove a custom assessment column
router.delete("/custom-assessment/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    await CustomAssessment.destroy({ where: { id } });
    res.status(200).json({ message: "Column deleted successfully" });
  } catch (error) {
    console.error("Error deleting assessment column:", error);
    res.status(500).json({ error: "Failed to delete column" });
  }
});

// POST: Save all custom grades and category with server-side validation against maxScore
router.post("/save-scores", verifyToken, async (req, res) => {
  try {
    const { updates } = req.body;
    // Expected format: updates = [{ assessmentId: 1, category: "Written Work", scores: { "studentId1": 95, "studentId2": 88 } }]

    for (const update of updates) {
      const { assessmentId, category, scores } = update;
      
      const assessment = await CustomAssessment.findByPk(assessmentId);
      
      if (!assessment) {
        continue;
      }

      const maxAllowedScore = assessment.maxScore || 100;
      const validatedScores = {};

      // Ensure no score exceeds the maximum score threshold
      for (const [studentId, rawScore] of Object.entries(scores || {})) {
        if (rawScore === "" || rawScore === null || rawScore === undefined) {
          continue;
        }

        const numericScore = parseFloat(rawScore);
        if (numericScore > maxAllowedScore) {
          return res.status(400).json({ 
            error: `Score for assessment "${assessment.name}" cannot exceed the maximum possible score of ${maxAllowedScore}` 
          });
        }
        
        validatedScores[studentId] = numericScore;
      }

      // Merge the existing JSON scores with the newly validated scores
      const updatedScores = {
        ...assessment.scores,
        ...validatedScores
      };
      
      // Update both scores and category in the database record
      await assessment.update({ 
        scores: updatedScores,
        ...(category ? { category } : {})
      });
    }
    
    res.status(200).json({ message: "Scores and category saved successfully" });
  } catch (error) {
    console.error("Error saving scores:", error);
    res.status(500).json({ error: "Failed to save scores" });
  }
});

module.exports = router;