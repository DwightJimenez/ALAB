// routes/logbook.js
const express = require("express");
const router = express.Router();
const { LogbookPage } = require("../models");
const { verifyToken } = require("../middleware/authMiddleware");

// Helper function to handle binary buffer / JSON conversions for BlockNote blocks
const formatPageResponse = (page) => {
  const jsonPage = page.toJSON();
  if (jsonPage.content) {
    let binaryData;
    if (Buffer.isBuffer(jsonPage.content)) {
      binaryData = jsonPage.content;
    } else if (
      jsonPage.content.type === "Buffer" &&
      Array.isArray(jsonPage.content.data)
    ) {
      binaryData = Buffer.from(jsonPage.content.data);
    } else {
      binaryData = Buffer.from(jsonPage.content);
    }
    try {
      // Decode binary back into the BlockNote JSON blocks array
      jsonPage.content = JSON.parse(binaryData.toString("utf8"));
    } catch (e) {
      jsonPage.content = [];
    }
  } else {
    jsonPage.content = [];
  }
  return jsonPage;
};

// Get all pages for logged-in user
router.get("/", verifyToken, async (req, res) => {
  try {
    const pages = await LogbookPage.findAll({
      where: { userId: req.user.id },
      order: [["updatedAt", "DESC"]],
    });

    const formattedPages = pages.map((page) => formatPageResponse(page));
    res.status(200).json(formattedPages);
  } catch (error) {
    console.error("Failed to fetch logbook pages:", error);
    res.status(500).json({ error: "Failed to fetch pages." });
  }
});

// Create a new page
router.post("/", verifyToken, async (req, res) => {
  try {
    const { title, content } = req.body;

    // Convert BlockNote JSON content array into a binary Buffer
    const jsonString = JSON.stringify(content || []);
    const binaryContent = Buffer.from(jsonString, "utf8");

    const newPage = await LogbookPage.create({
      userId: req.user.id,
      title: title || "Untitled",
      content: binaryContent,
    });

    res.status(201).json(formatPageResponse(newPage));
  } catch (error) {
    console.error("Failed to create page:", error);
    res.status(500).json({ error: "Failed to create page." });
  }
});

// Update an existing page (Title or BlockNote Content)
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    const page = await LogbookPage.findOne({
      where: { id, userId: req.user.id },
    });

    if (!page) {
      return res.status(404).json({ error: "Page not found." });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title || "Untitled";
    if (content !== undefined) {
      // Convert content to binary buffer
      updateData.content = Buffer.from(JSON.stringify(content), "utf8");
    }

    await page.update(updateData);

    res
      .status(200)
      .json({
        message: "Page updated successfully",
        page: formatPageResponse(page),
      });
  } catch (error) {
    console.error("Failed to update page:", error);
    res.status(500).json({ error: "Failed to update page." });
  }
});

// Delete a page
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const page = await LogbookPage.findOne({
      where: { id, userId: req.user.id },
    });

    if (!page) {
      return res.status(404).json({ error: "Page not found." });
    }

    await page.destroy();
    res.status(200).json({ message: "Page deleted successfully." });
  } catch (error) {
    console.error("Failed to delete page:", error);
    res.status(500).json({ error: "Failed to delete page." });
  }
});

module.exports = router;
