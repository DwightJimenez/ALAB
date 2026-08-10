const express = require("express");
const { Op } = require("sequelize");
const {
  MaterialRequest,
  Inventory,
  User,
  ItemInstance,
  StudentSkill,
  ExperimentAssignment,
  ExperimentTemplate,
  FacultySection, // <-- 1. Import FacultySection here
} = require("../models");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/checkout", verifyToken, async (req, res) => {
  try {
    // Extract groupId, reason, and requestType from the request body
    const { cartItems, groupId, reason, requestType } = req.body;
    const studentId = req.user.id;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: "Your cart is empty." });
    }

    const user = await User.findByPk(studentId);
    const combinedYearSection = `${user.year} - ${user.section}`;

    const activeGateAssignments = await ExperimentAssignment.findAll({
      where: {
        yearAndSection: combinedYearSection,
        activeSafetyGate: true,
      },
      include: [
        {
          model: ExperimentTemplate,
          as: "template",
          attributes: ["skillIds"],
        },
      ],
    });

    const rawSkillIds = activeGateAssignments
      .map((assignment) => assignment.template?.skillIds)
      .filter((ids) => Array.isArray(ids))
      .flat();

    const requiredSkillIds = [...new Set(rawSkillIds)];

    if (requiredSkillIds.length > 0) {
      const masteredCount = await StudentSkill.count({
        where: {
          userId: studentId,
          skillId: requiredSkillIds,
          isMastered: true,
        },
      });

      if (masteredCount < requiredSkillIds.length) {
        return res.status(403).json({
          error:
            "Access Denied: You must complete your Safety Gate assessments before requesting materials.",
        });
      }
    }

    // Default to 'LAB' if no requestType is explicitly passed
    const type = requestType || "LAB";

    // Attach groupId, requestType, and reason to the new database rows
    const requestsToCreate = cartItems.map((item) => ({
      studentId: studentId,
      groupId: groupId || null,
      inventoryId: item.inventoryId,
      amountRequested: item.quantity,
      status: "PENDING",
      requestType: type, // <-- Saved to DB here!
      reason: reason || null, // <-- Saved to DB here!
    }));

    await MaterialRequest.bulkCreate(requestsToCreate);

    res
      .status(201)
      .json({ message: "Booking request submitted successfully!" });
  } catch (error) {
    console.error("Checkout failed:", error);
    res.status(500).json({ error: "Failed to submit booking request." });
  }
});

router.get("/pending", verifyToken, async (req, res) => {
  try {
    const facultyId = req.user.id;

    // 2. Find all sections handled by this specific teacher
    const handledSections = await FacultySection.findAll({
      where: { facultyId },
      attributes: ["year", "section"],
    });

    if (handledSections.length === 0) {
      return res.status(200).json([]); // Teacher handles no sections, return empty array
    }

    // 3. Build OR condition to match students in these exact sections
    const sectionConditions = handledSections.map((hs) => ({
      year: hs.year,
      section: hs.section,
    }));

    const pendingRequests = await MaterialRequest.findAll({
      // --- ADDED: Exclude SPECIAL requests so they only go to admin ---
      where: { status: "PENDING", requestType: "LAB" },
      include: [
        {
          model: User,
          as: "student",
          attributes: ["name", "email", "year", "section"],
          where: {
            [Op.or]: sectionConditions, // <-- This ensures the teacher only sees requests from their own students!
          },
        },
        {
          model: Inventory,
          as: "inventory",
          include: [
            {
              model: ItemInstance,
              as: "instances",
              where: { condition: "Good" },
              required: false,
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(pendingRequests);
  } catch (error) {
    console.error("Failed to fetch pending requests:", error);
    res.status(500).json({ error: "Failed to load pending requests." });
  }
});

router.get("/active", verifyToken, async (req, res) => {
  try {
    const facultyId = req.user.id;

    // 2. Find all sections handled by this specific teacher
    const handledSections = await FacultySection.findAll({
      where: { facultyId },
      attributes: ["year", "section"],
    });

    if (handledSections.length === 0) {
      return res.status(200).json([]);
    }

    // 3. Build OR condition to match students in these exact sections
    const sectionConditions = handledSections.map((hs) => ({
      year: hs.year,
      section: hs.section,
    }));

    const activeRequests = await MaterialRequest.findAll({
      // --- ADDED: Exclude SPECIAL requests so they only go to admin ---
      where: { status: "APPROVED", requestType: "LAB" },
      include: [
        {
          model: User,
          as: "student",
          attributes: ["name", "email", "year", "section"],
          where: {
            [Op.or]: sectionConditions, // <-- Teacher only sees their own students!
          },
        },
        {
          model: Inventory,
          as: "inventory",
          include: [
            {
              model: ItemInstance,
              as: "instances",
              where: { condition: "In Use" },
              required: false,
            },
          ],
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    res.status(200).json(activeRequests);
  } catch (error) {
    console.error("Failed to fetch active requests:", error);
    res.status(500).json({ error: "Failed to load active requests." });
  }
});

router.put("/:id/approve", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedInstanceIds } = req.body;

    const request = await MaterialRequest.findByPk(id);
    if (!request) return res.status(404).json({ error: "Request not found." });

    request.status = "APPROVED";
    await request.save();

    if (assignedInstanceIds && assignedInstanceIds.length > 0) {
      await ItemInstance.update(
        { condition: "In Use" },
        { where: { id: assignedInstanceIds } },
      );
    }

    const inventory = await Inventory.findByPk(request.inventoryId);
    if (inventory) {
      inventory.totalQuantity -= request.amountRequested;
      await inventory.save();
    }

    res.status(200).json({ message: "Request approved successfully!" });
  } catch (error) {
    console.error("Approval failed:", error);
    res.status(500).json({ error: "Failed to approve request." });
  }
});

router.put("/:id/reject", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const request = await MaterialRequest.findByPk(id);
    if (!request) return res.status(404).json({ error: "Request not found." });

    request.status = "REJECTED";
    await request.save();

    res.status(200).json({ message: "Request rejected successfully!" });
  } catch (error) {
    console.error("Rejection failed:", error);
    res.status(500).json({ error: "Failed to reject request." });
  }
});

router.put("/:id/return", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { returnedInstances } = req.body;

    const request = await MaterialRequest.findByPk(id);
    if (!request) return res.status(404).json({ error: "Request not found." });

    request.status = "RETURNED";
    await request.save();

    if (returnedInstances && returnedInstances.length > 0) {
      for (const inst of returnedInstances) {
        await ItemInstance.update(
          { condition: inst.condition },
          { where: { id: inst.id } },
        );
      }
    }

    const inventory = await Inventory.findByPk(request.inventoryId);
    if (inventory) {
      inventory.totalQuantity += request.amountRequested;
      await inventory.save();
    }

    res.status(200).json({ message: "Items returned successfully!" });
  } catch (error) {
    console.error("Return failed:", error);
    res.status(500).json({ error: "Failed to process return." });
  }
});

router.put("/:id/cancel", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    const request = await MaterialRequest.findOne({
      where: { id, studentId, status: "PENDING" },
    });

    if (!request) {
      return res
        .status(404)
        .json({ error: "Request not found or cannot be cancelled." });
    }

    request.status = "CANCELLED";
    await request.save();

    res.status(200).json({ message: "Request cancelled successfully." });
  } catch (error) {
    console.error("Cancellation error:", error);
    res.status(500).json({ error: "Failed to cancel request." });
  }
});

router.get("/me", verifyToken, async (req, res) => {
  try {
    const studentId = req.user.id;
    const { groupId } = req.query;

    const whereClause = {
      [Op.or]: [{ studentId: studentId }],
    };

    if (groupId) {
      whereClause[Op.or].push({ groupId: groupId });
    }

    const requests = await MaterialRequest.findAll({
      where: whereClause,
      include: [{ model: Inventory, as: "inventory" }],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(requests);
  } catch (error) {
    console.error("Fetch personal requests error:", error);
    res.status(500).json({ error: "Failed to load your requests." });
  }
});

module.exports = router;
