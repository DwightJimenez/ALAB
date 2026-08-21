const express = require("express");
const bcrypt = require("bcrypt");
const {
  User,
  ExperimentAssignment,
  ExperimentTemplate,
  LabGroup,
  GroupMember,
} = require("../models");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { verifyToken } = require("../middleware/authMiddleware");


const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const setAuthCookie = (res, user) => {
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
    maxAge: 12 * 60 * 60 * 1000,
  });
};

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

    setAuthCookie(res, user);

    let pendingCount = 0;
    if (user.role === "STUDENT" && user.year && user.section) {
      const yearAndSection = `${user.year} - ${user.section}`;

      const assignments = await ExperimentAssignment.findAll({
        where: { yearAndSection: yearAndSection, status: "ACTIVE" },
        include: [
          {
            model: ExperimentTemplate,
            as: "template",
            attributes: [
              "title",
              "materials",
              "instructionsHTML",
              "isGroupSubmission",
              "maxGroupSize",
            ],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      await Promise.all(
        assignments.map(async (assignment) => {
          const userGroup = await LabGroup.findOne({
            where: { assignmentId: assignment.id },
            include: [
              {
                model: GroupMember,
                where: { userId: user.id },
                attributes: [],
              },
            ],
          });

          const isSubmitted = userGroup && userGroup.status === "SUBMITTED";

          if (!isSubmitted) {
            pendingCount++;
          }
        }),
      );
    }

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
        pendingAssignmentsCount: pendingCount,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "An error occurred during login." });
  }
});

router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: "Google sign-in is not configured." });
    }

    if (!credential) {
      return res.status(400).json({ error: "Google credential is required." });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload.email_verified) {
      return res.status(401).json({ error: "Your Google email could not be verified." });
    }

    const user = await User.findOne({
      where: { email: payload.email.toLowerCase() },
    });

    if (!user) {
      return res.status(403).json({
        error: "No ALAB account is registered for this Google email.",
      });
    }

    setAuthCookie(res, user);
    return res.status(200).json({
      message: "Google login successful!",
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
    console.error("Google login error:", error);
    return res.status(401).json({ error: "Google sign-in failed." });
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

    let pendingCount = 0;

    if (user.role === "STUDENT" && user.year && user.section) {
      const yearAndSection = `${user.year} - ${user.section}`;

      const assignments = await ExperimentAssignment.findAll({
        where: { yearAndSection: yearAndSection, status: "ACTIVE" },
        include: [
          {
            model: ExperimentTemplate,
            as: "template",
            attributes: [
              "title",
              "materials",
              "instructionsHTML",
              "isGroupSubmission",
              "maxGroupSize",
            ],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      await Promise.all(
        assignments.map(async (assignment) => {
          const userGroup = await LabGroup.findOne({
            where: { assignmentId: assignment.id },
            include: [
              {
                model: GroupMember,
                where: { userId: user.id },
                attributes: [],
              },
            ],
          });

          const isSubmitted = userGroup && userGroup.status === "SUBMITTED";

          if (!isSubmitted) {
            pendingCount++;
          }
        }),
      );
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
        pendingAssignmentsCount: pendingCount,
      },
    });
  } catch (error) {
    console.error("Verify error:", error);
    res.clearCookie("alab_token");
    return res.status(401).json({ error: "Invalid or expired token." });
  }
});

router.put("/update-password", verifyToken, async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res
        .status(400)
        .json({ error: "User ID and new password are required." });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long." });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await user.update({
      password: hashedPassword,
      avatar: user.avatar || "/avatar/avatar-1.svg",
    });

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Error updating password:", error);
    return res
      .status(500)
      .json({ error: "Internal server error while updating password." });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("alab_token");
  res.status(200).json({ message: "Logged out successfully" });
});

module.exports = router;
