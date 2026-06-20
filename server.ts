import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize the server-side Gemini client safely
  let ai: GoogleGenAI | null = null;
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
    try {
      ai = new GoogleGenAI({ apiKey });
    } catch (e) {
      console.error("Failed to initialize GoogleGenAI:", e);
    }
  }

  // API details route
  app.get("/api/status", (req, res) => {
    res.json({
      status: "online",
      aiAvailable: ai !== null,
      message: ai ? "AI services are active." : "AI API key missing in environment."
    });
  });

  // Main interactive AI Assistant endpoint supporting Optimize, Debug, and Explain
  app.post("/api/ai/action", async (req, res) => {
    const { action, code, name, description, userPrompt } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: "AI service is currently unavailable. Please check that GEMINI_API_KEY is configured in your environments/secrets."
      });
    }

    if (!code) {
      return res.status(400).json({ error: "Code content is required." });
    }

    try {
      let prompt = "";
      if (action === "optimize") {
        prompt = `
You are an expert JavaScript/Tampermonkey/Greasemonkey performance-tuning engineer.
Please optimize the following UserScript to ensure maximum execution speed, minimum memory layout footprint, and clean code flow.
Additionally, flag any potential bottlenecks, redundant DOM queries, memory leaks, security hazards or syntax flaws.

SCRIPT INFORMATION:
Name: ${name || "Untitled"}
Description: ${description || "No description"}

SCRIPT CODE:
\`\`\`javascript
${code}
\`\`\`

You must respond with a JSON object holding exactly these fields:
{
  "optimizedCode": "your optimized javascript user script code here",
  "explanation": "Markdown description of the optimizations applied and why they help.",
  "metrics": [
    {
      "name": "metric name e.g., Run Latency",
      "value": 12, // mock value or analytical estimate of latency decrease in ms
      "rating": "good", // "good" | "average" | "poor"
      "explanation": "brief description of improvement"
    }
  ],
  "warnings": [
    "List of potential warnings, security hazards or bottlenecks identified"
  ]
}

Ensure your response is valid JSON. Return ONLY the JSON object, do not wrap it in anything other than the JSON structure.
`;
      } else if (action === "debug") {
        prompt = `
You are an advanced debug assistant for web developers.
A developer is facing an issue with their UserScript.
Bug or Goal description: ${userPrompt || "The script is throwing errors or not running as expected."}

SCRIPT CODE:
\`\`\`javascript
${code}
\`\`\`

Please inspect the code, correct any syntactic or logical errors, handle unsafe elements gracefully, and return correct, working, and robust code.

You must respond with a JSON object holding exactly these fields:
{
  "optimizedCode": "your fully corrected and repaired javascript user script code",
  "explanation": "Markdown explanation of what the bug was, why it occurred, and how it was resolved.",
  "metrics": [],
  "warnings": []
}

Ensure your response is valid JSON. Return ONLY the JSON object.
`;
      } else if (action === "explain") {
        prompt = `
You are a code review auditor analyzing Tampermonkey / Greasemonkey UserScripts.
Please perform an in-depth code review of this script, explaining how it operates, identifying major capabilities (such as web requests, storage, or DOM injection), and highlighting any privacy or safety considerations.

SCRIPT CODE:
\`\`\`javascript
${code}
\`\`\`

You must respond with a JSON object holding exactly these fields:
{
  "optimizedCode": "", // Keep this empty
  "explanation": "Detailed professional review of the script architecture, components, and security review in elegant Markdown.",
  "metrics": [],
  "warnings": [
    "Security or privacy warning lists (e.g. 'Uses external CDN', 'Injects scripts' etc)"
  ]
}

Ensure your response is valid JSON. Return ONLY the JSON object.
`;
      } else {
        return res.status(400).json({ error: "Invalid action type. Must be 'optimize', 'debug', or 'explain'." });
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text || "{}";
      const cleanedText = text.trim();
      let result;

      try {
        result = JSON.parse(cleanedText);
      } catch (parseErr) {
        console.error("JSON parsing issue with Gemini output", text);
        // Fallback strategy if output is not correct JSON representation
        result = {
          optimizedCode: code,
          explanation: text || "Failed to parse optimized explanation from AI response.",
          metrics: [],
          warnings: ["Unable to structures metrics dynamically. See AI review text."]
        };
      }

      res.json(result);
    } catch (err: any) {
      console.error("Gemini API server side error:", err);
      res.status(500).json({
        error: "AI server generation completed with error: " + (err.message || err)
      });
    }
  });

  // Handle Vite middleware for development assets hot loading
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static files servicing
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Tampermonkey Script Manager v2 Server running on port ${PORT}`);
  });
}

startServer();
