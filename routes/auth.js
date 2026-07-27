const express = require("express");
const bcrypt = require("bcrypt");
const { User } = require("../models");
const jwt = require("jsonwebtoken");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ where: { email: email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email is already registered." });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await User.create({
      name: name,
      email: email,
      password: hashedPassword,
      role: role,
    });

    res.status(201).json({
      message: "User registered successfully!",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    if (error.name === "SequelizeValidationError") {
      return res
        .status(400)
        .json({ error: "Please provide a valid email address." });
    }
    res.status(500).json({ error: "Failed to register user." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email: email } });
    if (!user)
      return res.status(401).json({ error: "Invalid email or password." });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.status(401).json({ error: "Invalid email or password." });

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        role: user.role,
        section: user.section,
        avatar: user.avatar,
      },
      process.env.JWT_SECRET,
      { expiresIn: "12h" },
    );

    const isProduction = process.env.MODE_ENV === "production";

    res.cookie("alab_token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "None" : "Lax",
      secure: isProduction,
      maxAge: 12 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successful!",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        year: user.year,
        section: user.section,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "An error occurred during login." });
  }
});

router.get("/verify", async (req, res) => {
  try {
    const token = req.cookies.alab_token;
    if (!token) {
      return res.status(401).json({ error: "No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ error: "User no longer exists." });
    }

    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        year: user.year,
        section: user.section,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.clearCookie("alab_token");
    return res.status(401).json({ error: "Invalid or expired token." });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("alab_token");
  res.status(200).json({ message: "Logged out successfully" });
});

module.exports = router;
