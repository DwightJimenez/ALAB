const express = require('express');
const { User } = require('../models');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const router = express.Router();

// GET all users (Protected: Must be logged in AND be an Admin)
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const allUsers = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json(allUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users." });
  }
});


router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, role, password } = req.body; // The password comes from your React generator

    // 1. Check for duplicates
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email is already registered." });
    }

    // 2. Hash the password for the database
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. Save to PostgreSQL
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role.toUpperCase().trim()
    });

    // 4. Set up the Email Transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail', 
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // 5. Write the Email Content
    const mailOptions = {
      from: `"ALAB System Admin" <${process.env.EMAIL_USER}>`,
      to: email, // Sends to the new user's email
      subject: "Welcome to ALAB - Your Login Credentials",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #db2777;">Welcome to the ALAB System, ${name}!</h2>
          <p>An administrator has securely generated an account for you.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>System Role:</strong> ${newUser.role}</p>
            <p style="margin: 5px 0;"><strong>Login Email:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <span style="font-family: monospace; background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${password}</span></p>
          </div>
          
          <p>Please log in at your earliest convenience. We highly recommend updating your password upon your first login.</p>
          <a href="http://localhost:5173/login" style="display: inline-block; background-color: #db2777; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Log in to ALAB</a>
        </div>
      `
    };

    // 6. Send the Email
    await transporter.sendMail(mailOptions);

    res.status(201).json({
      message: "User created and email sent successfully",
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
    });

  } catch (error) {
    console.error("Error creating user:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }
    res.status(500).json({ error: "Failed to create user or send email." });
  }
});

module.exports = router;