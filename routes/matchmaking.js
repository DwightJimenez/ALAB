const express = require("express");
const { Op } = require("sequelize");
const {
  sequelize,
  User,
  StudentSkill,
  LabGroup,
  GroupMember,
} = require("../models");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/generate", async (req, res) => {
  try {
    const {
      yearAndSection,
      groupSize = 4,
      strategy = "heterogeneous",
    } = req.body;

    if (!yearAndSection) {
      return res.status(400).json({ error: "Year and section are required." });
    }

    const [year, section] = yearAndSection.split(/\s*-\s*/);

    const students = await User.findAll({
      where: {
        section: section,
        year: year,
        role: "STUDENT",
      },
      include: [
        {
          model: StudentSkill,
          attributes: ["currentPL"],
        },
      ],
    });

    if (!students.length) {
      return res
        .status(404)
        .json({ error: "No students found in this section." });
    }

    const formattedStudents = students.map((student) => {
      const skills = student.StudentSkills || [];

      const avgMastery =
        skills.length > 0
          ? skills.reduce((sum, skill) => sum + skill.currentPL, 0) /
            skills.length
          : 0.1;

      return {
        id: student.id,
        firstName: student.name.split(" ")[0],
        lastName: student.name.split(" ").slice(1).join(" ") || "",
        avatar: student.avatar,
        SafetyProfile: {
          bktScore: avgMastery,
        },
      };
    });

    formattedStudents.sort(
      (a, b) => b.SafetyProfile.bktScore - a.SafetyProfile.bktScore,
    );

    const numGroups = Math.ceil(formattedStudents.length / groupSize);
    const groups = Array.from({ length: numGroups }, () => []);

    if (strategy === "homogeneous") {
      formattedStudents.forEach((student, index) => {
        const groupIndex = Math.floor(index / groupSize);
        if (groups[groupIndex]) {
          groups[groupIndex].push(student);
        }
      });
    } else {
      formattedStudents.forEach((student, index) => {
        const cycle = Math.floor(index / numGroups);
        const groupIndex =
          cycle % 2 === 0
            ? index % numGroups
            : numGroups - 1 - (index % numGroups);

        if (groups[groupIndex]) {
          groups[groupIndex].push(student);
        }
      });
    }

    res.status(200).json({ success: true, groups });
  } catch (error) {
    console.error("Matchmaking Generate API Error:", error);
    res.status(500).json({ error: "Failed to generate lab groups." });
  }
});

router.post("/save", verifyToken, async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { labSessionId, assignmentId, finalizedGroups } = req.body;

    if (!finalizedGroups || !Array.isArray(finalizedGroups)) {
      return res.status(400).json({ error: "Invalid group data provided." });
    }

    for (const groupMembers of finalizedGroups) {
      if (groupMembers.length === 0) continue;

      const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const newGroup = await LabGroup.create(
        {
          joinCode,
          status: "ACTIVE",
          labSessionId: labSessionId || null,
          assignmentId: assignmentId || null,
        },
        { transaction: t },
      );

      const groupMemberRecords = groupMembers.map((student, index) => ({
        groupId: newGroup.id,
        userId: student.id,
        role: index === 0 ? "LEADER" : "MEMBER",
      }));

      await GroupMember.bulkCreate(groupMemberRecords, { transaction: t });
    }

    await t.commit();
    res.status(200).json({
      success: true,
      message: "Groups saved and activated successfully.",
    });
  } catch (error) {
    await t.rollback();
    console.error("Matchmaking Save API Error:", error);
    res.status(500).json({ error: "Failed to save lab groups to database." });
  }
});

module.exports = router;
