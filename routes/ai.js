const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
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

router.post("/parse-pdf", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file provided." });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    // Prepare PDF buffer for Gemini
    const pdfPart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: "application/pdf",
      },
    };

    const prompt = `
      Analyze this PDF lab manual/document and extract its content into semantic HTML.
      Rules:
      1. Preserve the visual structure, headings (h1, h2, h3), paragraphs, bold text, and lists (ul, ol).
      2. If there are tables, format them cleanly using standard <table>, <tr>, <th>, and <td> HTML tags.
      3. Do NOT include <html>, <head>, or <body> wrapper tags.
      4. Output ONLY clean HTML without markdown code fences or backticks (e.g., do not wrap in \`\`\`html).
    `;

    const result = await model.generateContent([prompt, pdfPart]);
    const htmlText = result.response.text().trim();

    // Clean up any stray markdown code fences if generated
    const cleanHtml = htmlText.replace(/^```html/, "").replace(/```$/, "").trim();

    res.json({ html: cleanHtml });
  } catch (error) {
    console.error("Gemini PDF parsing error:", error);
    res.status(500).json({ error: "Failed to process PDF with AI." });
  }
});

module.exports = router;
