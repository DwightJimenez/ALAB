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
const multer = require("multer");
const XlsxPopulate = require("xlsx-populate");

// Use memory storage so we don't clog up the server with temporary files
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// GET: Fetch attendance records, summaries, lab averages, and scores
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
      attributes: ["id", "name", "email", "avatar", "sex"],
      order: [["name", "ASC"]],
    });

    if (!students || students.length === 0) {
      return res.status(200).json({ students: [], hps: {}, totalSessions: 0 });
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

    // 7. Fetch Custom Assessments (which now represent our fixed columns like WW1, PT1, etc.)
    const customAssessments = await CustomAssessment.findAll({
      where: { facultyId, subjectId, section: section },
      attributes: ["name", "maxScore", "category", "scores"],
    });

    // Extract Highest Possible Scores into a flat object for the frontend
    const hps = {};
    customAssessments.forEach(assessment => {
      hps[assessment.name] = assessment.maxScore;
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

      // Extract custom scores mapping by the fixed column name
      const studentScores = {};
      customAssessments.forEach(assessment => {
        if (assessment.scores && assessment.scores[student.id] !== undefined) {
          studentScores[assessment.name] = assessment.scores[student.id];
        }
      });

      return {
        id: student.id,
        name: student.name,
        sex: student.sex,
        totalSessions,
        presentCount,
        lateCount,
        absentCount,
        attendancePercentage: percentage,
        labAvg: labAvgMap[student.id] !== undefined ? labAvgMap[student.id] : null,
        scores: studentScores 
      };
    });

    res.status(200).json({ 
      students: formattedStudents, 
      hps, 
      totalSessions: sessionIds.length 
    });
  } catch (error) {
    console.error("Fetch attendance class records error:", error);
    res.status(500).json({ error: "Failed to load class record data" });
  }
});

// POST: Save all custom grades based on the new ECR fixed-column format
router.post("/save-scores", verifyToken, async (req, res) => {
  try {
    const { subject, section, hps, students } = req.body;

    const subjectRecord = await Subject.findOne({ where: { name: subject } });
    if (!subjectRecord) {
      return res.status(404).json({ error: "Subject not found" });
    }

    const facultyId = subjectRecord.facultyId;

    // Fixed DepEd Columns mapping
    const ALL_KEYS = [
      "WW1", "WW2", "WW3", "WW4", "WW5",
      "PT1", "PT2", "PT3",
      "QA1", "QA2", "QA3"
    ];

    for (const key of ALL_KEYS) {
      // Determine category based on prefix
      let category = "Written Work";
      if (key.startsWith("PT")) category = "Performance Tasks";
      if (key.startsWith("QA")) category = "Quarterly Assessment";

      const maxScore = hps[key] !== undefined && hps[key] !== "" ? parseFloat(hps[key]) : 100;

      // Build the scores JSON for this specific key (column)
      const columnScores = {};
      
      students.forEach(student => {
        const rawScore = student.scores?.[key];
        if (rawScore !== undefined && rawScore !== null && rawScore !== "") {
          const numericScore = parseFloat(rawScore);
          
          if (numericScore > maxScore) {
            throw new Error(`Score ${numericScore} exceeds Highest Possible Score of ${maxScore} for ${key}`);
          }
          columnScores[student.id] = numericScore;
        }
      });

      // Find if this assessment column already exists for this section/subject
      let assessment = await CustomAssessment.findOne({
        where: {
          subjectId: subjectRecord.id,
          section: section,
          name: key 
        }
      });

      if (assessment) {
        // Update existing column
        await assessment.update({
          maxScore,
          category,
          scores: columnScores
        });
      } else {
        // Create new column only if an HPS was set or a score was entered
        if (hps[key] || Object.keys(columnScores).length > 0) {
          await CustomAssessment.create({
            facultyId,
            subjectId: subjectRecord.id,
            section,
            name: key,
            maxScore,
            category,
            scores: columnScores
          });
        }
      }
    }
    
    res.status(200).json({ message: "Grades saved successfully" });
  } catch (error) {
    console.error("Error saving scores:", error);
    res.status(400).json({ error: error.message || "Failed to save scores" });
  }
});

// POST: Add a new custom assessment column (Legacy/Manual Override just in case)
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

// DELETE: Remove a custom assessment column (Legacy/Manual Override just in case)
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

router.post("/populate-ecr", verifyToken, upload.single("ecrFile"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // React now perfectly formats the payloads
    const { inputDataPayload, term1Payload } = req.body;
    const parsedInput = JSON.parse(inputDataPayload);
    const parsedTerm1 = JSON.parse(term1Payload);

    // Open the macro-enabled .xlsm file
    const workbook = await XlsxPopulate.fromDataAsync(req.file.buffer);
    
    // Write everything securely to the INPUT DATA tab
    const inputSheet = workbook.sheet("INPUT DATA");
    parsedInput.forEach(data => {
      if (data.value) inputSheet.cell(data.cell).value(data.value);
    });

    // Write everything securely to the TERM 1 tab
    const term1Sheet = workbook.sheet("TERM 1");
    parsedTerm1.forEach(data => {
      if (data.value !== null && data.value !== "") {
        term1Sheet.cell(data.cell).value(data.value);
      }
    });

    const outputBuffer = await workbook.outputAsync();
    
    res.setHeader("Content-Type", "application/vnd.ms-excel.sheet.macroEnabled.12");
    res.setHeader("Content-Disposition", `attachment; filename="Populated_ECR.xlsm"`);
    res.send(outputBuffer);

  } catch (error) {
    console.error("ECR Population Error:", error);
    res.status(500).json({ error: "Failed to populate ECR" });
  }
});

module.exports = router;