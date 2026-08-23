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

// 1. Generate new groups via BKT logic
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

    let numGroups = Math.ceil(formattedStudents.length / groupSize);

    // PREVENT ISOLATED STUDENTS:
    // If the remaining student count for the last group is exactly 1,
    // reduce the number of groups by 1. This absorbs the solo student
    // into an existing group (e.g., 7 students / size 2 -> becomes 3, 2, 2 instead of 2, 2, 2, 1).
    if (numGroups > 1 && formattedStudents.length % groupSize === 1) {
      numGroups -= 1;
    }

    const groups = Array.from({ length: numGroups }, () => []);

    if (strategy === "homogeneous") {
      // Chunk the array smoothly so the extra students are distributed left-to-right
      const baseSize = Math.floor(formattedStudents.length / numGroups);
      const remainder = formattedStudents.length % numGroups;

      let currentIndex = 0;
      for (let i = 0; i < numGroups; i++) {
        const currentGroupSize = baseSize + (i < remainder ? 1 : 0);
        groups[i] = formattedStudents.slice(
          currentIndex,
          currentIndex + currentGroupSize,
        );
        currentIndex += currentGroupSize;
      }
    } else {
      // Heterogeneous (Snake draft / Round Robin)
      // This automatically handles the remainder naturally across the available numGroups
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

// 2. Fetch existing saved groups
router.get("/existing", async (req, res) => {
  try {
    const { assignmentId, sectionName } = req.query;

    // If there is no assignmentId yet, it means groups haven't been saved for this assignment
    if (!assignmentId) {
      return res.status(200).json({ success: true, groups: [] });
    }

    if (!sectionName) {
      return res.status(400).json({ error: "sectionName is required." });
    }

    const [year, section] = sectionName.split(/\s*-\s*/);

    // Fetch LabGroups tied to this assignment, ensuring we only get the ones for this specific section
    const labGroups = await LabGroup.findAll({
      where: {
        assignmentId: assignmentId,
        status: "ACTIVE", // Optional: filter out disabled/old groups if you use status
      },
      include: [
        {
          model: GroupMember,
          include: [
            {
              model: User,
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
            },
          ],
        },
      ],
      order: [["id", "ASC"]], // Keeps groups in consistent order
    });

    if (!labGroups.length) {
      return res.status(200).json({ success: true, groups: [] });
    }

    const formattedGroups = [];

    for (const group of labGroups) {
      const members = group.GroupMembers || [];

      // If this group had no members from the requested section, skip it
      if (members.length === 0) continue;

      // Ensure LEADER appears first in the array to maintain UI consistency if needed
      members.sort((a, b) => (a.role === "LEADER" ? -1 : 1));

      const formattedMembers = members.map((member) => {
        const student = member.User;
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

      formattedGroups.push(formattedMembers);
    }

    res.status(200).json({ success: true, groups: formattedGroups });
  } catch (error) {
    console.error("Matchmaking Existing API Error:", error);
    res.status(500).json({ error: "Failed to fetch existing lab groups." });
  }
});

// 3. Save modified groups to database
router.post("/save", verifyToken, async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { labSessionId, assignmentId, finalizedGroups, sectionName } =
      req.body;

    if (!finalizedGroups || !Array.isArray(finalizedGroups)) {
      return res.status(400).json({ error: "Invalid group data provided." });
    }

    // Optional: If overwriting, delete previous ACTIVE groups for this assignment/section first
    if (assignmentId) {
      const [year, section] = sectionName.split(/\s*-\s*/);

      // Find old groups to remove (prevents duplicates when clicking "Save" multiple times)
      const oldGroups = await LabGroup.findAll({
        where: { assignmentId },
        include: [
          {
            model: GroupMember,
            include: [
              {
                model: User,
                where: { section: section, year: year },
              },
            ],
          },
        ],
        transaction: t,
      });

      const oldGroupIds = oldGroups
        .filter((g) => g.GroupMembers.length > 0)
        .map((g) => g.id);

      if (oldGroupIds.length > 0) {
        await GroupMember.destroy({
          where: { groupId: oldGroupIds },
          transaction: t,
        });
        await LabGroup.destroy({ where: { id: oldGroupIds }, transaction: t });
      }
    }

    await Promise.all(
      finalizedGroups.map(async (groupMembers) => {
        if (groupMembers.length === 0) return;

        const joinCode = Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase();

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
      }),
    );

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
