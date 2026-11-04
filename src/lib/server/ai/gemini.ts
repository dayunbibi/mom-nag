import type { MomKey } from "../../moms";
import { parseNag, systemPrompt, USER_TEXT, type NagResult } from "./prompt";

// gemini-3.8-flash has a free tier and reads images. Override with GEMINI_MODEL.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

type GeminiPart = { text?: string };
type GeminiResponse = {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
};

export async function askGemini(imageBase64: string, mom: MomKey, apiKey: string): Promise<NagResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      // key in a header, not in the URL, so it doesn't end up in request logs
      "x-goog-api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt(mom) }] },
      contents: [
        {
          role: "user",
          parts: [{ inlineData: { mimeType: "image/jpeg", data: imageBase64 } }, { text: USER_TEXT }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json", // ask for raw JSON, parseNag still double-checks it
        maxOutputTokens: 2048, // newer Flash models may think first, leave room for the answer
      },
    }),
    signal: AbortSignal.timeout(25_000),
  });

  if (!res.ok) {
    // 429 = free tier limit hit for the minute/day
    console.error("Gemini API error", res.status, await res.text());
    throw new Error(`Gemini API ${res.status}`);
  }

  const data: GeminiResponse = await res.json();
  if (data.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked the photo: ${data.promptFeedback.blockReason}`);
  }
  const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  return parseNag(text);
}
