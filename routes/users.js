const express = require('express');
const { User } = require('../models');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// GET all users (Protected: Must be logged in AND be an Admin)
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const allUsers = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'createdAt'], // Exclude passwords!
      order: [['createdAt', 'DESC']] // Newest users first
    });

    res.status(200).json(allUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

module.exports = router;