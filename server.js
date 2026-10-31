
// JARVIS AI - Secure AI Backend
// File: server.js

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));

const PORT = process.env.PORT || 3000;

// Keep these values in server environment variables.
const AI_URL = process.env.AI_URL;
const AI_KEY = process.env.AI_KEY;
const AI_MODEL = process.env.AI_MODEL;

const conversations = new Map();

app.get("/", (req, res) => {
  res.json({
    name: "JARVIS AI",
    status: "Backend running",
    version: "0.2"
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    if (!AI_URL || !AI_KEY || !AI_MODEL) {
      return res.status(503).json({
        error: "AI provider is not configured"
      });
    }

    const id = String(sessionId || "default");

    let history = conversations.get(id) || [];

    history.push({
      role: "user",
      content: message.slice(0, 12000)
    });

    // Keep recent conversation context.
    history = history.slice(-16);

    const response = await fetch(AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${AI_KEY}`
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: "system",
            content: `
You are JARVIS AI, a helpful multilingual
assistant.

Understand Telugu and English.
Give clear, accurate answers.
Explain difficult topics step by step.
Never pretend to have completed an action
that you did not perform.
Use tools only when they are actually connected.
`
          },
          ...history
        ],
        temperature: 0.6
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI provider error:", response.status);
      return res.status(502).json({
        error: "AI provider request failed",
        status: response.status
      });
    }

    const data = await response.json();

    const answer =
      data.choices?.[0]?.message?.content;

    if (!answer) {
      return res.status(502).json({
        error: "AI returned no answer"
      });
    }

    history.push({
      role: "assistant",
      content: answer
    });

    conversations.set(id, history);

    res.json({
      success: true,
      answer,
      model: AI_MODEL
    });

  } catch (error) {
    console.error("JARVIS error:", error.message);

    res.status(500).json({
      error: "Unable to process request"
    });
  }
});

app.listen(PORT, () => {
  console.log(`JARVIS AI running on port ${PORT}`);
});
