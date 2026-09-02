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
  RequestLog,
} = require("../models");
const { verifyToken } = require("../middleware/authMiddleware");

// 1. IMPORT BOTH EMAIL AND SMS NOTIFICATION FUNCTIONS
const {
  sendRequestStatusNotification,
  sendRequestStatusSms,
} = require("../utils/emailService");

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
    const bundleRef = currentBundleId.split("-")[0].toUpperCase(); // Creates a clean ref code

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

    // Create requests and return the instances to get their IDs
    const createdRequests = await MaterialRequest.bulkCreate(requestsToCreate, {
      returning: true,
    });

    // --- HISTORY LOG: CREATED ---
    const logs = createdRequests.map((reqItem) => ({
      requestId: reqItem.id,
      actorId: studentId,
      action: "CREATED",
    }));
    await RequestLog.bulkCreate(logs);

    // Fetch item names to build a readable summary list for the notification
    const inventoryItems = await Inventory.findAll({
      where: { id: cartItems.map((item) => item.inventoryId) },
      attributes: ["id", "name"],
    });
    const itemMap = new Map(inventoryItems.map((inv) => [inv.id, inv.name]));
    const itemListSummary = cartItems
      .map(
        (item) =>
          `${itemMap.get(item.inventoryId) || "Item"} (x${item.quantity})`,
      )
      .join(", ");

    // --- CONCURRENT EMAIL & SMS NOTIFICATION (1 BUNDLE SUMMARY) ---
    const notificationData = {
      recipients: [
        { email: user.email, name: user.name, phone: user.phoneNumber },
      ],
      itemName: itemListSummary,
      status: "PENDING",
      studentName: user.name,
      details: `Your request has been submitted successfully. (Ref: ${bundleRef})`,
    };

    await Promise.all([
      sendRequestStatusNotification(notificationData),
      sendRequestStatusSms(notificationData),
    ]);

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
    const { assignedInstanceIds, assignedControlNumbers } = req.body;

    const request = await MaterialRequest.findByPk(id, {
      include: [{ model: Inventory, as: "inventory" }],
    });
    if (!request) return res.status(404).json({ error: "Request not found." });

    request.status = "APPROVED";

    if (assignedControlNumbers && assignedControlNumbers.length > 0) {
      request.assignedControlNumbers = assignedControlNumbers;
    }

    await request.save();

    // --- HISTORY LOG: APPROVED ---
    await RequestLog.create({
      requestId: request.id,
      actorId: req.user.id,
      action: "APPROVED",
    });

    const requestOwner = await User.findByPk(request.studentId, {
      attributes: ["name", "email", "phoneNumber"],
    });

    if (requestOwner) {
      const bundleRef = request.bundleId
        ? request.bundleId.split("-")[0].toUpperCase()
        : id;

      const notificationData = {
        recipients: [
          {
            email: requestOwner.email,
            name: requestOwner.name,
            phone: requestOwner.phoneNumber,
          },
        ],
        itemName: request.inventory?.name || "Material Request",
        status: "APPROVED",
        studentName: requestOwner.name,
        details: `Your request for ${request.inventory?.name || "item"} (x${request.amountRequested}) has been approved. (Ref: ${bundleRef})`,
      };

      await Promise.all([
        sendRequestStatusNotification(notificationData),
        sendRequestStatusSms(notificationData),
      ]);
    }

    if (assignedInstanceIds && assignedInstanceIds.length > 0) {
      await ItemInstance.update(
        { condition: "In Use" },
        { where: { id: { [Op.in]: assignedInstanceIds } } },
      );
    }

    if (
      request.inventory &&
      request.inventory.category?.toUpperCase() === "CHEMICAL"
    ) {
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

    const request = await MaterialRequest.findByPk(id, {
      include: [{ model: Inventory, as: "inventory" }],
    });
    if (!request) return res.status(404).json({ error: "Request not found." });

    if (
      request.assignedControlNumbers &&
      request.assignedControlNumbers.length > 0
    ) {
      await ItemInstance.update(
        { condition: "Good" },
        {
          where: { controlNumber: { [Op.in]: request.assignedControlNumbers } },
        },
      );
    }

    request.status = "REJECTED";
    await request.save();

    await RequestLog.create({
      requestId: request.id,
      actorId: req.user.id,
      action: "REJECTED",
    });

    const requestOwner = await User.findByPk(request.studentId, {
      attributes: ["name", "email", "phoneNumber"],
    });

    if (requestOwner) {
      const bundleRef = request.bundleId
        ? request.bundleId.split("-")[0].toUpperCase()
        : id;

      const notificationData = {
        recipients: [
          {
            email: requestOwner.email,
            name: requestOwner.name,
            phone: requestOwner.phoneNumber,
          },
        ],
        itemName: request.inventory?.name || "Material Request",
        status: "REJECTED",
        studentName: requestOwner.name,
        details: `Your request for ${request.inventory?.name || "item"} could not be approved at this time. (Ref: ${bundleRef})`,
      };

      await Promise.all([
        sendRequestStatusNotification(notificationData),
        sendRequestStatusSms(notificationData),
      ]);
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

    const request = await MaterialRequest.findByPk(id, {
      include: [{ model: Inventory, as: "inventory" }],
    });
    if (!request) return res.status(404).json({ error: "Request not found." });

    let remarks = "All items returned in good condition.";

    if (returnedInstances && returnedInstances.length > 0) {
      const conditionsMap = returnedInstances.map((i) => i.condition);
      const damages = conditionsMap.filter((c) => c !== "Good");
      if (damages.length > 0) {
        remarks = `Items returned with issues: ${damages.join(", ")}`;
      }

      for (const inst of returnedInstances) {
        await ItemInstance.update(
          { condition: inst.condition },
          { where: { id: inst.id } },
        );
      }
    }

    await RequestLog.create({
      requestId: request.id,
      actorId: req.user.id,
      action: "RETURNED",
      remarks: remarks,
    });

    const requestOwner = await User.findByPk(request.studentId, {
      attributes: ["name", "email", "phoneNumber"],
    });

    if (requestOwner) {
      const bundleRef = request.bundleId
        ? request.bundleId.split("-")[0].toUpperCase()
        : id;

      const notificationData = {
        recipients: [
          {
            email: requestOwner.email,
            name: requestOwner.name,
            phone: requestOwner.phoneNumber,
          },
        ],
        itemName: request.inventory?.name || "Material Request",
        status: "RETURNED",
        studentName: requestOwner.name,
        details: `Your return for ${request.inventory?.name || "equipment"} has been processed. (Ref: ${bundleRef})`,
      };

      await Promise.all([
        sendRequestStatusNotification(notificationData),
        sendRequestStatusSms(notificationData),
      ]);
    }
    request.status = "RETURNED";
    await request.save();

    res
      .status(200)
      .json({ message: "Items returned and archived successfully!" });
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
      include: [{ model: Inventory, as: "inventory" }],
    });

    if (!request) {
      return res
        .status(404)
        .json({ error: "Request not found or cannot be cancelled." });
    }

    if (
      request.assignedControlNumbers &&
      request.assignedControlNumbers.length > 0
    ) {
      await ItemInstance.update(
        { condition: "Good" },
        {
          where: { controlNumber: { [Op.in]: request.assignedControlNumbers } },
        },
      );
    }

    request.status = "CANCELLED";
    await request.save();

    await RequestLog.create({
      requestId: request.id,
      actorId: req.user.id,
      action: "CANCELLED",
    });

    const requestOwner = await User.findByPk(studentId, {
      attributes: ["name", "email", "phoneNumber"],
    });

    if (requestOwner) {
      const bundleRef = request.bundleId
        ? request.bundleId.split("-")[0].toUpperCase()
        : id;

      const notificationData = {
        recipients: [
          {
            email: requestOwner.email,
            name: requestOwner.name,
            phone: requestOwner.phoneNumber,
          },
        ],
        itemName: request.inventory?.name || "Material Request",
        status: "CANCELLED",
        studentName: requestOwner.name,
        details: `Your request has been successfully cancelled. (Ref: ${bundleRef})`,
      };

      await Promise.all([
        sendRequestStatusNotification(notificationData),
        sendRequestStatusSms(notificationData),
      ]);
    }

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

// GET /api/requests/special/history
router.get("/special/history", verifyToken, async (req, res) => {
  try {
    const role = req.user.role?.toLowerCase();
    if (role !== "admin" && role !== "technician" && role !== "faculty") {
      return res.status(403).json({ error: "Access Denied." });
    }

    // 1. Query the RequestLog table directly
    const historyLogs = await RequestLog.findAll({
      include: [
        {
          model: MaterialRequest,
          // We must include the MaterialRequest to know it was a "SPECIAL" request
          // and to get the student/inventory details for the frontend
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
              attributes: ["id", "name", "unit", "category"],
              include: [
                { model: ItemInstance, as: "instances", required: false },
              ],
            },
          ],
        },
        {
          model: User,
          as: "actor", // The admin/faculty who performed the action
          attributes: ["name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // 2. Format the logs into the shape your React frontend expects
    const formattedHistory = historyLogs.map((log) => {
      // Extract the nested MaterialRequest data
      const reqData = log.MaterialRequest ? log.MaterialRequest.toJSON() : {};

      return {
        id: reqData.id,
        bundleId: reqData.bundleId,
        amountRequested: reqData.amountRequested,
        assignedControlNumbers: reqData.assignedControlNumbers,
        reason: reqData.reason,
        notedBy: reqData.notedBy,
        user: reqData.student, // Frontend maps this to bundle.user
        inventory: reqData.inventory, // Frontend maps this to bundle.items
        status: log.action, // Uses the Log's action (RETURNED, CANCELLED, etc)
        createdAt: log.createdAt, // Uses the exact time the log was created
        remarks: log.remarks, // Any damage notes from the log
      };
    });

    res.status(200).json(formattedHistory);
  } catch (error) {
    console.error("Failed to fetch special request history:", error);
    res.status(500).json({ error: "Failed to load history." });
  }
});

// BUNDLE ASSIGN: Single consolidated notification
router.put("/bundle/:bundleId/assign", verifyToken, async (req, res) => {
  try {
    const { bundleId } = req.params;
    const { assignments, controlNumbersMap } = req.body;
    const bundleRef = bundleId.split("-")[0].toUpperCase(); // Creates a clean ref code

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

      if (controlNumbersMap && controlNumbersMap[request.id]) {
        request.assignedControlNumbers = controlNumbersMap[request.id];
        await request.save();
      }

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

      await RequestLog.create({
        requestId: request.id,
        actorId: req.user.id,
        action: "ASSIGNED",
        remarks: "Control numbers allocated.",
      });
    }

    // Build itemized list
    const itemListSummary = requests
      .map((r) => `${r.inventory?.name || "Item"} (x${r.amountRequested})`)
      .join(", ");

    const firstReq = requests[0];
    const student = await User.findByPk(firstReq.studentId, {
      attributes: ["name", "email", "phoneNumber"],
    });

    if (student) {
      const notificationData = {
        recipients: [
          {
            email: student.email,
            name: student.name,
            phone: student.phoneNumber,
          },
        ],
        itemName: itemListSummary,
        status: "PENDING",
        studentName: student.name,
        details: `Control numbers allocated. Please log in to your portal to print your borrowing form and secure your teacher's signature. (Ref: ${bundleRef})`,
      };

      await Promise.all([
        sendRequestStatusNotification(notificationData),
        sendRequestStatusSms(notificationData),
      ]);
    }

    res.status(200).json({
      message: "Items Reserved & Control numbers successfully assigned.",
    });
  } catch (error) {
    console.error("Bundle assignment failed:", error);
    res.status(500).json({ error: "Failed to assign bundle." });
  }
});

// BUNDLE APPROVE: Single consolidated notification
router.put("/bundle/:bundleId/approve", verifyToken, async (req, res) => {
  try {
    const { bundleId } = req.params;
    const { assignments, controlNumbersMap } = req.body;
    const bundleRef = bundleId.split("-")[0].toUpperCase();

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

      await RequestLog.create({
        requestId: request.id,
        actorId: req.user.id,
        action: "APPROVED",
      });

      const assignedInstanceIds = assignments?.[request.id] || [];

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

    // Build consolidated item list
    const itemListSummary = requests
      .map((r) => `${r.inventory?.name || "Item"} (x${r.amountRequested})`)
      .join(", ");

    const firstReq = requests[0];
    const student = await User.findByPk(firstReq.studentId, {
      attributes: ["name", "email", "phoneNumber"],
    });

    if (student) {
      const notificationData = {
        recipients: [
          {
            email: student.email,
            name: student.name,
            phone: student.phoneNumber,
          },
        ],
        itemName: itemListSummary,
        status: "APPROVED",
        studentName: student.name,
        details: `Your request bundle has been approved and is ready for pickup. (Ref: ${bundleRef})`,
      };

      await Promise.all([
        sendRequestStatusNotification(notificationData),
        sendRequestStatusSms(notificationData),
      ]);
    }

    res.status(200).json({ message: "Bundle approved successfully!" });
  } catch (error) {
    console.error("Bundle approval failed:", error);
    res.status(500).json({ error: "Failed to approve bundle." });
  }
});

// BUNDLE REJECT: Single consolidated notification
router.put("/bundle/:bundleId/reject", verifyToken, async (req, res) => {
  try {
    const { bundleId } = req.params;
    const bundleRef = bundleId.split("-")[0].toUpperCase();

    const requests = await MaterialRequest.findAll({
      where: { bundleId, status: "PENDING" },
      include: [{ model: Inventory, as: "inventory" }],
    });

    if (!requests || requests.length === 0) {
      return res.status(404).json({ error: "Bundle not found." });
    }

    for (const request of requests) {
      if (
        request.assignedControlNumbers &&
        request.assignedControlNumbers.length > 0
      ) {
        await ItemInstance.update(
          { condition: "Good" },
          {
            where: {
              controlNumber: { [Op.in]: request.assignedControlNumbers },
            },
          },
        );
      }

      request.status = "REJECTED";
      await request.save();

      await RequestLog.create({
        requestId: request.id,
        actorId: req.user.id,
        action: "REJECTED",
      });
    }

    // Build itemized list
    const itemListSummary = requests
      .map((r) => `${r.inventory?.name || "Item"} (x${r.amountRequested})`)
      .join(", ");

    const firstReq = requests[0];
    const student = await User.findByPk(firstReq.studentId, {
      attributes: ["name", "email", "phoneNumber"],
    });

    if (student) {
      const notificationData = {
        recipients: [
          {
            email: student.email,
            name: student.name,
            phone: student.phoneNumber,
          },
        ],
        itemName: itemListSummary,
        status: "REJECTED",
        studentName: student.name,
        details: `Your request could not be approved at this time. (Ref: ${bundleRef})`,
      };

      await Promise.all([
        sendRequestStatusNotification(notificationData),
        sendRequestStatusSms(notificationData),
      ]);
    }

    res.status(200).json({ message: "Bundle rejected successfully!" });
  } catch (error) {
    console.error("Bundle rejection failed:", error);
    res.status(500).json({ error: "Failed to reject bundle." });
  }
});

module.exports = router;
