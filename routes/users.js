const express = require("express");
const { User } = require("../models");
const { Op } = require("sequelize");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");
const bcrypt = require("bcrypt");

// 1. Import BOTH the email and SMS notification functions
const { sendWelcomeEmail, sendWelcomeSms } = require("../utils/emailService");

const router = express.Router();

router.get("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const allUsers = await User.findAll({
      attributes: [
        "id",
        "name",
        "email",
        "role",
        "section",
        "year",
        "sex", 
        "phoneNumber",
        "createdAt",
      ],
      order: [["createdAt", "ASC"]],
    });

    res.status(200).json(allUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

router.post("/", verifyToken, requireAdmin, async (req, res) => {
  const t = await User.sequelize.transaction();

  try {
    const { name, email, role, password, section, year, sex, phoneNumber } = req.body;

    const existingUser = await User.findOne({
      where: { email },
      transaction: t,
    });
    if (existingUser) {
      await t.rollback();
      return res.status(400).json({ error: "Email is already registered." });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await User.create(
      {
        name,
        email,
        password: hashedPassword,
        role: role.toUpperCase().trim(),
        section,
        year,
        sex,
        phoneNumber,
      },
      { transaction: t },
    );

    try {
      // 2. Send both Email and SMS concurrently
      await Promise.all([
        sendWelcomeEmail({
          name,
          email,
          role: newUser.role,
          password,
        }),
        sendWelcomeSms({
          name,
          phone: newUser.phoneNumber, // Pass the phone number here
          role: newUser.role,
          password,
        })
      ]);
    } catch (notificationError) {
      console.error(
        "Warning: User created successfully, but one or more notifications failed.",
        notificationError,
      );
    }

    await t.commit();

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        sex: newUser.sex,
        phoneNumber: newUser.phoneNumber, 
      },
    });
  } catch (error) {
    await t.rollback();
    console.error("Error creating user:", error);

    if (error.name === "SequelizeValidationError") {
      return res
        .status(400)
        .json({ error: "Please provide a valid email address." });
    }
    res.status(500).json({
      error: "Failed to create user.",
    });
  }
});

router.get("/sections", async (req, res) => {
  try {
    const usersWithClasses = await User.findAll({
      attributes: ["year", "section"],
      where: {
        section: {
          [Op.not]: null,
          [Op.ne]: "",
        },
        year: {
          [Op.not]: null,
          [Op.ne]: "",
        },
        role: "STUDENT",
      },
      group: ["year", "section"],
      order: [
        ["year", "ASC"],
        ["section", "ASC"],
      ],
    });

    const formattedClasses = usersWithClasses.map(
      (u) => `${u.year} - ${u.section}`,
    );

    res.status(200).json(formattedClasses);
  } catch (error) {
    console.error("Failed to fetch classes:", error);
    res.status(500).json({ error: "Failed to load classes." });
  }
});

router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, section, year, sex, phoneNumber } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (email !== user.email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        return res
          .status(400)
          .json({ error: "This email is already in use by another account." });
      }
    }

    await user.update({
      name,
      email,
      role: role.toUpperCase().trim(),
      section,
      year,
      sex,
      phoneNumber, 
    });

    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    console.error("Error updating user:", error);
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        error: "Please provide valid data (e.g., a correct email format).",
      });
    }
    res.status(500).json({ error: "Failed to update user." });
  }
});

router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (req.user && req.user.id === parseInt(id)) {
      return res
        .status(403)
        .json({ error: "You cannot delete your own admin account." });
    }

    await user.destroy();

    res.status(200).json({ message: "User deleted successfully." });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user." });
  }
});

module.exports = router;