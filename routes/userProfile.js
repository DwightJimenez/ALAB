const express = require("express");
const { User } = require("../models");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.put("/avatar", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { avatar } = req.body;

    if (!avatar) {
      return res.status(400).json({ error: "Avatar path is required." });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    user.avatar = avatar;
    await user.save();

    res.status(200).json({
      message: "Avatar updated successfully",
      avatar: user.avatar,
    });
  } catch (error) {
    console.error("Error updating avatar:", error);
    res.status(500).json({ error: "Failed to update avatar." });
  }
});

module.exports = router;
