const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/extract-steps", async (req, res) => {
  try {
    const { html } = req.body;

    if (!html) {
      return res.status(400).json({ error: "HTML content is required." });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `
      You are a laboratory instruction parser. 
      Take the following HTML instructions and break them down into a logical sequence of actionable steps. 
      Respond ONLY with a valid JSON object matching this schema:
      
      {
        "steps": [
          {
            "title": "Short, imperative action title",
            "description": "Clear explanation of what to do",
            "warning": "Any safety or specific technical warnings (or null if none) important"
          }
        ]
      }

      HTML Instructions:
      ${html}
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse the strict JSON string returned by the model
    const parsedData = JSON.parse(responseText);

    res.json(parsedData);
  } catch (error) {
    console.error("AI Extraction Error:", error);
    res.status(500).json({ error: "Failed to generate interactive guide." });
  }
});

module.exports = router;
