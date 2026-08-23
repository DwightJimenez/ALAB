const express = require("express");
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const reactionSchema = {
  type: SchemaType.OBJECT,
  properties: {
    equation: {
      type: SchemaType.STRING,
      description:
        "Balanced chemical equation, or '[A] + [B] → No Reaction' if inert",
    },
    productName: { type: SchemaType.STRING },
    reactionType: { type: SchemaType.STRING },
    exothermic: { type: SchemaType.BOOLEAN },
    visualEffect: {
      type: SchemaType.STRING,
      enum: [
        "neutralization",
        "bubbling",
        "precipitate",
        "colorChange",
        "gas",
        "dissolve",
        "explosion",
        "inert",
        "none",
      ],
    },
    description: { type: SchemaType.STRING },
    // NEW: Add the warning property
    warning: {
      type: SchemaType.STRING,
      description:
        "Specific safety hazards (e.g., 'Toxic gas produced', 'Highly corrosive'). Return 'None' if generally safe.",
    },
  },
  // NEW: Add 'warning' to the required array
  required: [
    "equation",
    "productName",
    "reactionType",
    "exothermic",
    "visualEffect",
    "description",
    "warning",
  ],
};

router.post("/evaluate-reaction", async (req, res) => {
  try {
    const { chemA, chemB } = req.body;

    if (!chemA || !chemB) {
      return res
        .status(400)
        .json({ error: "Missing chemical inputs (chemA, chemB)" });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: reactionSchema,
      },
    });

    const prompt = `
      Evaluate the chemical reaction between ${chemA} and ${chemB} at standard room temperature and pressure (STP).
      If no reaction occurs under standard conditions, mark visualEffect as 'inert' and exothermic as false.
    `;

    const result = await model.generateContent(prompt);
    const reactionData = JSON.parse(result.response.text());

    res.json(reactionData);
  } catch (error) {
    console.error("Chemistry Engine Error:", error);
    res.status(500).json({ error: "Failed to evaluate chemical reaction." });
  }
});

// ==========================================
// 2. HTML LAB INSTRUCTION PARSER
// ==========================================
const stepsSchema = {
  type: SchemaType.OBJECT,
  properties: {
    steps: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: {
            type: SchemaType.STRING,
            description: "Short, imperative action title",
          },
          description: {
            type: SchemaType.STRING,
            description: "Clear explanation of what to do",
          },
          warning: {
            type: SchemaType.STRING,
            description:
              "Any safety or specific technical warnings. Return null if none.",
          },
        },
        required: ["title", "description", "warning"],
      },
    },
  },
  required: ["steps"],
};

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

// ==========================================
// 3. PDF PARSER
// ==========================================
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
    const cleanHtml = htmlText
      .replace(/^```html/, "")
      .replace(/```$/, "")
      .trim();

    res.json({ html: cleanHtml });
  } catch (error) {
    console.error("Gemini PDF parsing error:", error);
    res.status(500).json({ error: "Failed to process PDF with AI." });
  }
});

// ==========================================
// 4. WORD DOCUMENT PARSER
// ==========================================
router.post("/parse-word", upload.single("word"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No Word document provided." });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    // Prepare Word document buffer for Gemini using its detected MIME type
    const wordPart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: req.file.mimetype,
      },
    };

    const prompt = `
      Analyze this Word document and extract its content into semantic HTML.
      Rules:
      1. Preserve the visual structure, headings (h1, h2, h3), paragraphs, bold text, and lists (ul, ol).
      2. If there are tables, format them cleanly using standard <table>, <tr>, <th>, and <td> HTML tags.
      3. Do NOT include <html>, <head>, or <body> wrapper tags.
      4. Output ONLY clean HTML without markdown code fences or backticks (e.g., do not wrap in \`\`\`html).
    `;

    const result = await model.generateContent([prompt, wordPart]);
    const htmlText = result.response.text().trim();

    // Clean up any stray markdown code fences if generated
    const cleanHtml = htmlText
      .replace(/^```html/, "")
      .replace(/```$/, "")
      .trim();

    res.json({ html: cleanHtml });
  } catch (error) {
    console.error("Gemini Word parsing error:", error);
    res.status(500).json({ error: "Failed to process Word document with AI." });
  }
});

module.exports = router;
