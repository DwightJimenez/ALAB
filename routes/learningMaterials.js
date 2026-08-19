const express = require("express");
const { LearningMaterial, User, Subject } = require("../models");
const { verifyToken } = require("../middleware/authMiddleware");
const { createClient } = require("@supabase/supabase-js");
const { sendMaterialNotification } = require("../utils/emailService");

const router = express.Router();

// Initialize Supabase Client on the backend
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// POST: Save metadata when frontend finishes uploading to Supabase Storage
router.post("/upload", verifyToken, async (req, res) => {
  try {
    const { title, description, yearAndSection, subjectId, fileUrl, fileType } =
      req.body;

    if (!fileUrl) {
      return res.status(400).json({ error: "No file URL provided." });
    }

    if (!title || !yearAndSection) {
      return res
        .status(400)
        .json({ error: "Title and target section are required." });
    }

    const newMaterial = await LearningMaterial.create({
      title,
      description,
      fileUrl,
      fileType: fileType || "FILE",
      yearAndSection,
      subjectId: subjectId || null,
      facultyId: req.user.id,
    });

    const yearSectionParts = yearAndSection.includes(" - ")
      ? yearAndSection.split(" - ")
      : [null, yearAndSection];
    const [yearValue, sectionValue] = yearSectionParts;

    const students = await User.findAll({
      where: {
        role: "STUDENT",
        ...(yearValue ? { year: yearValue } : {}),
        ...(sectionValue ? { section: sectionValue } : {}),
      },
      attributes: ["name", "email"],
    });

    if (students.length > 0) {
      await sendMaterialNotification({
        recipients: students.map((student) => ({
          email: student.email,
          name: student.name,
        })),
        title,
        section: yearAndSection,
        uploadedBy: req.user?.name || "Faculty",
        description,
      });
    }

    res.status(201).json({
      message: "Learning material published successfully!",
      material: newMaterial,
    });
  } catch (error) {
    console.error("Publication failed:", error);
    res.status(500).json({ error: "Failed to save learning material." });
  }
});

// GET: Fetch materials for a specific section
router.get("/:section", verifyToken, async (req, res) => {
  try {
    const { section } = req.params;

    const materials = await LearningMaterial.findAll({
      where: { yearAndSection: section },
      include: [
        { model: User, as: "faculty", attributes: ["name"] },
        { model: Subject, as: "subject", attributes: ["name"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(materials);
  } catch (error) {
    console.error("Failed to fetch materials:", error);
    res.status(500).json({ error: "Failed to load learning materials." });
  }
});

// DELETE: Delete a material record from DB and remove file from Supabase Storage
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const material = await LearningMaterial.findByPk(id);

    if (!material) {
      return res.status(404).json({ error: "Material not found." });
    }

    if (material.facultyId !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Unauthorized to delete this material." });
    }

    // --- EXTRACT FILENAME & DELETE FROM SUPABASE STORAGE ---
    if (material.fileUrl) {
      const urlParts = material.fileUrl.split("/");
      const fileName = urlParts[urlParts.length - 1]; // e.g. "abc_123.pdf"

      if (fileName) {
        const { error: storageError } = await supabase.storage
          .from("learning-materials")
          .remove([fileName]);

        if (storageError) {
          console.error(
            "Failed to delete file from Supabase storage:",
            storageError,
          );
          // Continue deleting from DB even if storage removal throws a warning
        }
      }
    }

    // Destroy database record
    await material.destroy();

    res
      .status(200)
      .json({ message: "Material and cloud file deleted successfully." });
  } catch (error) {
    console.error("Deletion failed:", error);
    res.status(500).json({ error: "Failed to delete material." });
  }
});

module.exports = router;
