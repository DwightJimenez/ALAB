const express = require("express");
const { Op } = require("sequelize");
const crypto = require("crypto");
const {
  MaterialRequest,
  Inventory,
  User,
  ItemInstance,
  StudentSkill,
  ExperimentAssignment,
  ExperimentTemplate,
  FacultySection,
} = require("../models");
const { verifyToken } = require("../middleware/authMiddleware");
const { sendRequestStatusNotification } = require("../utils/emailService");

const router = express.Router();

router.post("/checkout", verifyToken, async (req, res) => {
  try {
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

    const type = requestType || "LAB";
    const currentBundleId = crypto.randomUUID();

    const requestsToCreate = cartItems.map((item) => ({
      studentId: studentId,
      groupId: groupId || null,
      inventoryId: item.inventoryId,
      amountRequested: item.quantity,
      status: "PENDING",
      requestType: type,
      reason: reason || null,
      bundleId: currentBundleId,
    }));

    await MaterialRequest.bulkCreate(requestsToCreate);

    await sendRequestStatusNotification({
      recipients: [{ email: user.email, name: user.name }],
      itemName: "Material Request",
      status: "PENDING",
      studentName: user.name,
      details: `Your request for ${cartItems.length} item(s) was submitted successfully.`,
    });

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

    const handledSections = await FacultySection.findAll({
      where: { facultyId },
      attributes: ["year", "section"],
    });

    if (handledSections.length === 0) {
      return res.status(200).json([]);
    }

    const sectionConditions = handledSections.map((hs) => ({
      year: hs.year,
      section: hs.section,
    }));

    const pendingRequests = await MaterialRequest.findAll({
      where: { status: "PENDING", requestType: "LAB" },
      include: [
        {
          model: User,
          as: "student",
          attributes: ["name", "email", "year", "section"],
          where: {
            [Op.or]: sectionConditions,
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

    const handledSections = await FacultySection.findAll({
      where: { facultyId },
      attributes: ["year", "section"],
    });

    if (handledSections.length === 0) {
      return res.status(200).json([]);
    }

    const sectionConditions = handledSections.map((hs) => ({
      year: hs.year,
      section: hs.section,
    }));

    const activeRequests = await MaterialRequest.findAll({
      where: { status: "APPROVED", requestType: "LAB" },
      include: [
        {
          model: User,
          as: "student",
          attributes: ["name", "email", "year", "section"],
          where: {
            [Op.or]: sectionConditions,
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
    // EXTRACT assignedControlNumbers from the frontend request
    const { assignedInstanceIds, assignedControlNumbers } = req.body;

    const request = await MaterialRequest.findByPk(id, {
      include: [{ model: Inventory, as: "inventory" }],
    });
    if (!request) return res.status(404).json({ error: "Request not found." });

    request.status = "APPROVED";
    
    // SAVE THE CONTROL NUMBERS TO THE DATABASE
    if (assignedControlNumbers && assignedControlNumbers.length > 0) {
      request.assignedControlNumbers = assignedControlNumbers;
    }
    
    await request.save();

    const requestOwner = await User.findByPk(request.studentId, {
      attributes: ["name", "email"],
    });

    if (requestOwner) {
      await sendRequestStatusNotification({
        recipients: [{ email: requestOwner.email, name: requestOwner.name }],
        itemName: request.inventory?.name || "Material Request",
        status: "APPROVED",
        studentName: requestOwner.name,
        details: "Your request has been approved and is now active.",
      });
    }

    if (assignedInstanceIds && assignedInstanceIds.length > 0) {
      await ItemInstance.update(
        { condition: "In Use" },
        { where: { id: { [Op.in]: assignedInstanceIds } } },
      );
    }

    if (request.inventory && request.inventory.category?.toUpperCase() === "CHEMICAL") {
      let remainingToDeduct = request.amountRequested;

      const availableInstances = await ItemInstance.findAll({
        where: {
          inventoryId: request.inventoryId,
          quantity: { [Op.gt]: 0 },
        },
        order: [["createdAt", "ASC"]],
      });

      for (const inst of availableInstances) {
        if (remainingToDeduct <= 0) break;

        if (inst.quantity >= remainingToDeduct) {
          inst.quantity -= remainingToDeduct;
          remainingToDeduct = 0;
          await inst.save();
        } else {
          remainingToDeduct -= inst.quantity;
          inst.quantity = 0;
          await inst.save();
        }
      }
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

    const requestOwner = await User.findByPk(request.studentId, {
      attributes: ["name", "email"],
    });

    if (requestOwner) {
      await sendRequestStatusNotification({
        recipients: [{ email: requestOwner.email, name: requestOwner.name }],
        itemName: request.inventory?.name || "Material Request",
        status: "REJECTED",
        studentName: requestOwner.name,
        details: "Your request could not be approved at this time.",
      });
    }

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

    // Only Equipment has returnedInstances. We update their condition.
    // Chemicals are consumed, so we don't do anything to inventory quantities here.
    if (returnedInstances && returnedInstances.length > 0) {
      for (const inst of returnedInstances) {
        await ItemInstance.update(
          { condition: inst.condition },
          { where: { id: inst.id } },
        );
      }
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

// ==========================================
// ADMIN: SPECIAL REQUESTS ENDPOINTS
// ==========================================

router.get("/special", verifyToken, async (req, res) => {
  try {
    const role = req.user.role?.toLowerCase();
    if (role !== "admin" && role !== "technician" && role !== "faculty") {
      return res.status(403).json({ error: "Access Denied." });
    }

    const specialRequests = await MaterialRequest.findAll({
      where: { requestType: "SPECIAL" },
      include: [
        {
          model: User,
          as: "student",
          attributes: ["id", "name", "email", "year", "section"],
        },
        {
          model: Inventory,
          as: "inventory",
          // Removed totalQuantity from here so it doesn't crash
          attributes: ["id", "name", "unit", "category"],
          include: [
            {
              model: ItemInstance,
              as: "instances",
              required: false,
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const formattedRequests = specialRequests.map((req) => {
      const reqJSON = req.toJSON();
      reqJSON.user = reqJSON.student;
      return reqJSON;
    });

    res.status(200).json(formattedRequests);
  } catch (error) {
    console.error("Failed to fetch special requests:", error);
    res.status(500).json({ error: "Failed to load special requests." });
  }
});

// --- NEW: BUNDLE ASSIGN ENDPOINT (Saves control numbers but leaves status PENDING) ---
router.put("/bundle/:bundleId/assign", verifyToken, async (req, res) => {
  try {
    const { bundleId } = req.params;
    const { assignments, controlNumbersMap } = req.body;

    const requests = await MaterialRequest.findAll({
      where: { bundleId, status: "PENDING" },
      include: [{ model: Inventory, as: "inventory" }],
    });

    if (!requests || requests.length === 0) {
      return res
        .status(404)
        .json({ error: "Bundle not found or is no longer pending." });
    }

    for (const request of requests) {
      const previousCNs = request.assignedControlNumbers || [];
      const newCNs = controlNumbersMap
        ? controlNumbersMap[request.id] || []
        : [];

      // If the admin changes their mind and unchecks a box, release the old CN back to "Good"
      const releasedCNs = previousCNs.filter((cn) => !newCNs.includes(cn));
      if (releasedCNs.length > 0 && request.inventoryId) {
        await ItemInstance.update(
          { condition: "Good" },
          {
            where: {
              inventoryId: request.inventoryId,
              controlNumber: releasedCNs,
              condition: "Reserved",
            },
          },
        );
      }

      // Save the new assigned numbers to the request row
      if (controlNumbersMap && controlNumbersMap[request.id]) {
        request.assignedControlNumbers = controlNumbersMap[request.id];
        await request.save();
      }

      // Mark the newly selected instances as "Reserved" (excluding chemicals)
      const assignedInstanceIds = assignments
        ? assignments[request.id] || []
        : [];
      if (
        assignedInstanceIds.length > 0 &&
        request.inventory?.category !== "CHEMICAL"
      ) {
        await ItemInstance.update(
          { condition: "Reserved" },
          { where: { id: assignedInstanceIds } },
        );
      }
    }

    res
      .status(200)
      .json({
        message: "Items Reserved & Control numbers successfully assigned.",
      });
  } catch (error) {
    console.error("Bundle assignment failed:", error);
    res.status(500).json({ error: "Failed to assign bundle." });
  }
});

// --- UPDATED: BUNDLE APPROVE ENDPOINT W/ CONTROL NUMBERS ---
router.put("/bundle/:bundleId/approve", verifyToken, async (req, res) => {
  try {
    const { bundleId } = req.params;
    const { assignments, controlNumbersMap } = req.body;

    const requests = await MaterialRequest.findAll({
      where: { bundleId, status: "PENDING" },
      include: [{ model: Inventory, as: "inventory" }],
    });

    if (!requests || requests.length === 0) {
      return res.status(404).json({ error: "Bundle not found." });
    }

    for (const request of requests) {
      request.status = "APPROVED";

      if (controlNumbersMap && controlNumbersMap[request.id]) {
        request.assignedControlNumbers = controlNumbersMap[request.id];
      }

      await request.save();

      const assignedInstanceIds = assignments[request.id] || [];

      // 1. Equipment Logic
      if (assignedInstanceIds.length > 0) {
        await ItemInstance.update(
          { condition: "In Use" },
          { where: { id: assignedInstanceIds } },
        );
      }

      // 2. Chemical Logic
      if (request.inventory && request.inventory.category === "CHEMICAL") {
        let remainingToDeduct = request.amountRequested;

        const availableInstances = await ItemInstance.findAll({
          where: {
            inventoryId: request.inventoryId,
            quantity: { [Op.gt]: 0 },
          },
          order: [["createdAt", "ASC"]],
        });

        for (const inst of availableInstances) {
          if (remainingToDeduct <= 0) break;

          if (inst.quantity >= remainingToDeduct) {
            inst.quantity -= remainingToDeduct;
            remainingToDeduct = 0;
            await inst.save();
          } else {
            remainingToDeduct -= inst.quantity;
            inst.quantity = 0;
            await inst.save();
          }
        }
      }
    }

    res.status(200).json({ message: "Bundle approved successfully!" });
  } catch (error) {
    console.error("Bundle approval failed:", error);
    res.status(500).json({ error: "Failed to approve bundle." });
  }
});

// --- BUNDLE REJECT ENDPOINT ---
router.put("/bundle/:bundleId/reject", verifyToken, async (req, res) => {
  try {
    const { bundleId } = req.params;

    const requests = await MaterialRequest.findAll({
      where: { bundleId, status: "PENDING" },
    });

    for (const request of requests) {
      request.status = "REJECTED";
      await request.save();
    }

    res.status(200).json({ message: "Bundle rejected successfully!" });
  } catch (error) {
    console.error("Bundle rejection failed:", error);
    res.status(500).json({ error: "Failed to reject bundle." });
  }
});

module.exports = router;
