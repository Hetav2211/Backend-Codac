import { GoogleGenAI } from "@google/genai";

export async function chat(req, res) {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message not provided!" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured!" });
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelsToTry = ["gemini-2.5-flash", "gemini-pro"];

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Format this response with Markdown (use **bold**, *italics*, and line breaks): ${message}`,
              },
            ],
          },
        ],
      });

      // Return the formatted response
      return res.status(200).json({
        chatRes: response.text,
      });
    } catch (error) {
      console.error(`Failed with ${model}:`, error.message);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return res.status(503).json({
    error: "AI service is currently unavailable. Try again later.",
  });
}
