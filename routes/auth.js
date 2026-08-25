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

// --- HELPER FUNCTION: Optimize Student Data Fetch ---
// This prevents writing the exact same complex logic in both /login and /verify
const getEnrichedStudentData = async (user) => {
  let pendingCount = 0;
  let missingCount = 0;
  let labContexts = [];

  if (user.role === "STUDENT" && user.year && user.section) {
    const yearAndSection = `${user.year} - ${user.section}`;
    const now = new Date();

    // 1. Fetch all active assignments for the section
    const assignments = await ExperimentAssignment.findAll({
      where: { yearAndSection: yearAndSection, status: "ACTIVE" },
      include: [
        {
          model: ExperimentTemplate,
          as: "template",
          attributes: [
            "title",
            "materials",
            "isGroupSubmission",
            "maxGroupSize",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // 2. EAGER LOAD: Fetch ALL of the user's groups and teammates in ONE query
    const userGroups = await LabGroup.findAll({
      include: [
        {
          model: GroupMember,
          where: { userId: user.id },
          attributes: ["role"], // Gives us "LEADER" or "MEMBER"
        },
        {
          model: User,
          as: "members",
          attributes: ["id", "name", "email", "avatar"],
        },
      ],
    });

    // Create a dictionary for O(1) fast lookup
    const groupMap = {};
    userGroups.forEach((group) => {
      groupMap[group.assignmentId] = group;
    });

    // 3. Calculate status and build payload
    assignments.forEach((assignment) => {
      const group = groupMap[assignment.id];
      const isSubmitted = group && group.status === "SUBMITTED";

      if (!isSubmitted) {
        // Check if past due
        if (assignment.dueDate && new Date(assignment.dueDate) < now) {
          missingCount++;
        } else {
          pendingCount++;
        }
      }

      // If the user has joined a group for this assignment, cache the details
      if (group) {
        labContexts.push({
          assignmentId: assignment.id,
          groupId: group.id,
          joinCode: group.joinCode,
          status: group.status,
          role: group.GroupMembers[0]?.role || "MEMBER",
          members: group.members,
        });
      }
    });
  }

  return {
    ...user.toJSON(),
    pendingAssignmentsCount: pendingCount,
    missingAssignmentsCount: missingCount,
    totalActionRequired: pendingCount + missingCount, // Use this for the Redux badge!
    labContexts, // Instantly provides group members & leader status to frontend
  };
};

router.post("/register", async (req, res) => {
  try {
    // Extract expected fields from the request body
    // Adjust these fields based on what your frontend registration form actually sends
    const { name, email, password, role, year, section } = req.body;

    // 1. Basic validation
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email, and password are required." });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long." });
    }

    // 2. Check if a user with this email already exists
    const existingUser = await User.findOne({
      where: { email: email.toLowerCase() },
    });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "An account with this email already exists." });
    }

    // 3. Hash the password securely
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 4. Create the new user in the database
    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || "STUDENT", // Default to STUDENT if not specified
      year: year || null,
      section: section || null,
    });

    // 5. Clean up the response (don't send the password hash back to the frontend)
    const userResponse = newUser.toJSON();
    delete userResponse.password;

    res.status(201).json({
      message: "Registration successful!",
      user: userResponse,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "An error occurred during registration." });
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

    // Use the optimized helper
    const enrichedUser = await getEnrichedStudentData(user);

    res.status(200).json({
      message: "Login successful!",
      user: enrichedUser,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "An error occurred during login." });
  }
});

router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!process.env.GOOGLE_CLIENT_ID)
      return res
        .status(503)
        .json({ error: "Google sign-in is not configured." });
    if (!credential)
      return res.status(400).json({ error: "Google credential is required." });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload.email_verified) {
      return res
        .status(401)
        .json({ error: "Your Google email could not be verified." });
    }

    const user = await User.findOne({
      where: { email: payload.email.toLowerCase() },
    });
    if (!user)
      return res.status(403).json({
        error: "No ALAB account is registered for this Google email.",
      });

    setAuthCookie(res, user);

    // Use the optimized helper
    const enrichedUser = await getEnrichedStudentData(user);

    return res.status(200).json({
      message: "Google login successful!",
      user: enrichedUser,
    });
  } catch (error) {
    console.error("Google login error:", error);
    return res.status(401).json({ error: "Google sign-in failed." });
  }
});

router.get("/verify", async (req, res) => {
  try {
    const token = req.cookies.alab_token;
    if (!token) return res.status(401).json({ error: "No token provided." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(401).json({ error: "User no longer exists." });

    // Use the optimized helper
    const enrichedUser = await getEnrichedStudentData(user);

    res.status(200).json({ user: enrichedUser });
  } catch (error) {
    console.error("Verify error:", error);
    res.clearCookie("alab_token");
    return res.status(401).json({ error: "Invalid or expired token." });
  }
});

router.put("/update-password", verifyToken, async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    // 1. Basic validation
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    // 2. Security Check: Ensure the user making the request is updating their own password
    // (Assuming your verifyToken middleware attaches the decoded token to `req.user`)
    if (req.user && req.user.id !== userId) {
      return res.status(403).json({ error: "Unauthorized to update this account." });
    }

    // 3. Find the user in the database
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // 4. Hash the new password securely
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // 5. Update and save the user
    user.password = hashedPassword;
    
    // NEW: Update the avatar to the default if they don't have one yet.
    // This perfectly triggers your frontend logic (!user.avatar) to recognize the first login is complete!
    if (!user.avatar) {
      user.avatar = "/avatar/avatar-1.svg";
    }

    await user.save();

    res.status(200).json({ message: "Password updated successfully!" });
  } catch (error) {
    console.error("Update password error:", error);
    res.status(500).json({ error: "An error occurred while updating the password." });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("alab_token");
  res.status(200).json({ message: "Logged out successfully" });
});

module.exports = router;
