const express = require("express");
const { GradingCriteria } = require("../models");
const { verifyToken } = require("../middleware/authMiddleware");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const router = express.Router();
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST: Generate Rubric using Gemini AI (Must be ABOVE /:facultyId to avoid routing conflicts)
router.post("/generate-rubric", verifyToken, async (req, res) => {
  const { lessonText } = req.body;

  if (!lessonText) {
    return res.status(400).json({ error: "Missing lessonText." });
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

    const prompt = `
      You are an expert instructional designer. Analyze the following laboratory experiment instructions.
      
      Generate a comprehensive 1-to-5 grading rubric with 3 to 4 evaluation criteria based specifically on the required tasks, data collection, and safety requirements of this experiment.

      Laboratory Material:
      """
      ${lessonText}
      """

      INSTRUCTIONS:
      Respond ONLY with a valid JSON array matching the exact schema below. Do not use markdown code blocks (\`\`\`json).

      JSON Schema:
      [
        {
          "name": "Criterion Description (e.g., 'Data Collection Accuracy')",
          "ratings": {
            "5": "Excellent specific indicator",
            "4": "Good specific indicator",
            "3": "Average specific indicator",
            "2": "Fair specific indicator",
            "1": "Poor specific indicator"
          }
        }
      ]
    `;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text().trim();

    // Match the JSON array
    const jsonMatch = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!jsonMatch) throw new Error("Invalid AI response structure");

    const rubric = JSON.parse(jsonMatch[0]);

    res.status(200).json({ rubric });
  } catch (error) {
    console.error("Gemini Rubric Generation Error:", error);
    res.status(500).json({ error: "Failed to generate rubric." });
  }
});


// GET: Fetch all criteria profiles for the logged-in faculty
router.get("/:facultyId", verifyToken, async (req, res) => {
  try {
    const { facultyId } = req.params;
    const criteriaList = await GradingCriteria.findAll({
      where: { facultyId },
      order: [["createdAt", "DESC"]],
    });
    res.status(200).json(criteriaList);
  } catch (error) {
    console.error("Fetch criteria error:", error);
    res.status(500).json({ error: "Failed to load rubric criteria profiles." });
  }
});

// POST: Create a new rubric criteria profile
router.post("/", verifyToken, async (req, res) => {
  try {
    const { facultyId, name, components } = req.body;

    if (!name || !components || components.length === 0) {
      return res
        .status(400)
        .json({ error: "Name and components are required." });
    }

    const newCriteria = await GradingCriteria.create({
      facultyId,
      name,
      components,
    });

    res.status(201).json(newCriteria);
  } catch (error) {
    console.error("Create criteria error:", error);
    res.status(500).json({ error: "Failed to save rubric criteria." });
  }
});

// DELETE: Remove a rubric criteria profile
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const criteria = await GradingCriteria.findByPk(id);

    if (!criteria) {
      return res.status(404).json({ error: "Criteria profile not found." });
    }

    await criteria.destroy();
    res.status(200).json({ message: "Criteria profile deleted successfully." });
  } catch (error) {
    console.error("Delete criteria error:", error);
    res.status(500).json({ error: "Failed to delete criteria profile." });
  }
});

module.exports = router;