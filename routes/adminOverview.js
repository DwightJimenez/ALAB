const express = require("express");
const { Op } = require("sequelize");
const { 
  User, 
  Inventory, 
  ItemInstance, 
  MaterialRequest, 
  LabSession 
} = require("../models");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// --- ADMIN DASHBOARD API ---
// Apply the middleware directly to the route chain
router.get("/dashboard", verifyToken, requireAdmin, async (req, res) => {
  try {
    // 1. Get Top-Level Stats
    const totalUsers = await User.count();
    const pendingRequests = await MaterialRequest.count({ 
      where: { status: "PENDING" } 
    });
    const pendingLabSessions = await LabSession.count({ 
      where: { status: "PENDING" } 
    });
    const totalInventory = await Inventory.sum("totalQuantity") || 0;

    // 2. Get Expiring Chemicals (Expiring in the next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringItems = await ItemInstance.findAll({
      where: {
        expirationDate: {
          [Op.not]: null,
          [Op.lte]: thirtyDaysFromNow,
        }
      },
      include: [{ 
        model: Inventory, 
        attributes: ['name', 'category'] 
      }],
      order: [['expirationDate', 'ASC']],
      limit: 10
    });

    // 3. Generate Activity Logs (Combine recent requests & lab sessions)
    const recentRequests = await MaterialRequest.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'student', attributes: ['name'] }]
    });

    const recentSessions = await LabSession.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'faculty', attributes: ['name'] }]
    });

    // Format and sort activity logs
    let activityLogs = [];
    
    recentRequests.forEach(request => {
      activityLogs.push({
        id: `req-${request.id}`,
        action: `Material Request ${request.status}`,
        user: request.student ? request.student.name : 'Unknown User',
        date: request.createdAt,
        type: 'request'
      });
    });

    recentSessions.forEach(session => {
      activityLogs.push({
        id: `lab-${session.id}`,
        action: `Lab Session ${session.status}`,
        user: session.faculty ? session.faculty.name : 'Unknown Faculty',
        date: session.createdAt,
        type: 'lab'
      });
    });

    // Sort combined logs from newest to oldest and take the top 8
    activityLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
    activityLogs = activityLogs.slice(0, 8);

    // 4. Send unified response
    res.status(200).json({
      stats: {
        totalUsers,
        pendingRequests,
        pendingLabSessions,
        totalInventory
      },
      expiringItems: expiringItems.map(item => ({
        id: item.id,
        controlNumber: item.controlNumber,
        name: item.Inventory ? item.Inventory.name : "Unknown",
        quantity: item.quantity,
        expirationDate: item.expirationDate,
        condition: item.condition
      })),
      activityLogs
    });

  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data." });
  }
});

router.get("/reports", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { type, period } = req.query; // type: 'inventory' | 'activity', period: 'month' | 'year'
    
    // Calculate date ranges
    const now = new Date();
    let startDate, endDate;
    
    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    }

    if (type === 'inventory') {
      // 1. Formal Inventory Report
      const inventory = await ItemInstance.findAll({
        include: [{ model: Inventory, attributes: ['name', 'category', 'unit'] }],
        order: [[Inventory, 'category', 'ASC'], ['expirationDate', 'ASC']]
      });
      
      return res.status(200).json({ reportData: inventory, type: 'inventory', period, startDate, endDate });
    } 
    
    if (type === 'activity') {
      // 2. Formal Activity Log (Filtered by Date Range)
      const requests = await MaterialRequest.findAll({
        where: { createdAt: { [Op.between]: [startDate, endDate] } },
        include: [
          { model: User, as: 'student', attributes: ['name', 'section'] },
          { model: Inventory, as: 'inventory', attributes: ['name'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      return res.status(200).json({ reportData: requests, type: 'activity', period, startDate, endDate });
    }

    res.status(400).json({ error: "Invalid report type." });

  } catch (error) {
    console.error("Report generation error:", error);
    res.status(500).json({ error: "Failed to generate report." });
  }
});

module.exports = router;