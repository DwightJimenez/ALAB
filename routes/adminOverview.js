const express = require("express");
const { Op } = require("sequelize");
const {
  User,
  Inventory,
  ItemInstance,
  MaterialRequest,
  LabSession,
} = require("../models");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/dashboard", verifyToken, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.count();
    const pendingRequests = await MaterialRequest.count({
      where: { status: "PENDING" },
    });
    const pendingLabSessions = await LabSession.count({
      where: { status: "PENDING" },
    });

    const totalInventory = (await ItemInstance.count()) || 0;

    const availableItems =
      (await ItemInstance.count({
        where: { condition: "Good" },
      })) || 0;

    const borrowedItems =
      (await ItemInstance.count({
        where: { condition: "In Use" },
      })) || 0;

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringItems = await ItemInstance.findAll({
      where: {
        expirationDate: {
          [Op.not]: null,
          [Op.lte]: thirtyDaysFromNow,
        },
      },
      include: [
        {
          model: Inventory,
          attributes: ["name", "category"],
        },
      ],
      order: [["expirationDate", "ASC"]],
      limit: 10,
    });

    const recentRequests = await MaterialRequest.findAll({
      limit: 5,
      order: [["createdAt", "DESC"]],
      include: [{ model: User, as: "student", attributes: ["name"] }],
    });

    const recentSessions = await LabSession.findAll({
      limit: 5,
      order: [["createdAt", "DESC"]],
      include: [{ model: User, as: "faculty", attributes: ["name"] }],
    });

    let activityLogs = [];

    recentRequests.forEach((request) => {
      activityLogs.push({
        id: `req-${request.id}`,
        action: `Material Request ${request.status}`,
        user: request.student ? request.student.name : "Unknown User",
        date: request.createdAt,
        type: "request",
      });
    });

    recentSessions.forEach((session) => {
      activityLogs.push({
        id: `lab-${session.id}`,
        action: `Lab Session ${session.status}`,
        user: session.faculty ? session.faculty.name : "Unknown Faculty",
        date: session.createdAt,
        type: "lab",
      });
    });

    activityLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
    activityLogs = activityLogs.slice(0, 8);

    res.status(200).json({
      stats: {
        totalUsers,
        pendingRequests,
        pendingLabSessions,
        totalInventory,
        availableItems,
        borrowedItems,
      },
      expiringItems: expiringItems.map((item) => ({
        id: item.id,
        controlNumber: item.controlNumber,
        name: item.Inventory ? item.Inventory.name : "Unknown",
        quantity: item.quantity,
        expirationDate: item.expirationDate,
        condition: item.condition,
      })),
      activityLogs,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data." });
  }
});
router.get("/reports", verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      type,
      period,
      startDate: customStart,
      endDate: customEnd,
    } = req.query;

    let startDate = new Date();
    let endDate = new Date(); // Defaults to today

    if (period === "month") {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === "year") {
      startDate.setFullYear(startDate.getFullYear() - 1);
    } else if (period === "custom" && customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
      // Set end time to end of day so records on the final day are included
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate.setMonth(startDate.getMonth() - 3); // Default fallback
    }

    let reportData = [];

    if (type === "activity") {
      reportData = await MaterialRequest.findAll({
        where: {
          createdAt: {
            [Op.between]: [startDate, endDate],
          },
        },
        include: [
          {
            model: User,
            as: "student",
            attributes: ["name", "section", "email"],
          },
          {
            model: Inventory,
            as: "inventory",
            attributes: ["name", "category", "unit"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });
    } else if (type === "consumables") {
      reportData = await ItemInstance.findAll({
        include: [
          {
            model: Inventory,
            where: { category: "CHEMICAL" },
            attributes: ["name", "category", "unit"],
          },
        ],
        order: [["expirationDate", "ASC"]],
      });
    } else if (type === "damages") {
      reportData = await MaterialRequest.findAll({
        where: {
          status: "RETURNED",
          updatedAt: {
            [Op.between]: [startDate, endDate],
          },
        },
        include: [
          { model: User, as: "student", attributes: ["name", "section"] },
          {
            model: Inventory,
            as: "inventory",
            attributes: ["name", "category"],
          },
        ],
        order: [["updatedAt", "DESC"]],
      });
    }

    res.status(200).json({
      type,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      reportData,
    });
  } catch (error) {
    console.error("Report generation error:", error);
    res.status(500).json({ error: "Failed to generate report data." });
  }
});

module.exports = router;
