import type { MomKey } from "../../moms";
import { parseNag, systemPrompt, USER_TEXT, type NagResult } from "./prompt";

// Both have a free tier and read images. Lite goes first because it answers fast;
// free models get "high demand" (503) errors or just hang at busy times,
// so if one is busy or slow we try the other. Override the first choice with GEMINI_MODEL.
const MODELS = [process.env.GEMINI_MODEL || "gemini-3.5-flash-lite", "gemini-3.8-flash"];

// two tries have to fit inside the route's 30s limit
const TIMEOUT_MS = 12_000;

type GeminiPart = { text?: string };
type GeminiResponse = {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
};

class GeminiError extends Error {
  constructor(public status: number) {
    super(`Gemini API ${status}`);
  }
}

// 500/503 or no answer in time = Google's side is busy, worth trying the next model.
// 429 = our free quota, another model won't help.
const isBusy = (err: unknown) =>
  (err instanceof GeminiError && (err.status === 503 || err.status === 500)) ||
  (err instanceof Error && err.name === "TimeoutError");

async function callModel(model: string, imageBase64: string, mom: MomKey, apiKey: string): Promise<NagResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
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
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    console.error(`Gemini API error (${model})`, res.status, await res.text());
    throw new GeminiError(res.status);
  }

  const data: GeminiResponse = await res.json();
  if (data.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked the photo: ${data.promptFeedback.blockReason}`);
  }
  const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  return parseNag(text);
}

export async function askGemini(imageBase64: string, mom: MomKey, apiKey: string): Promise<NagResult> {
  let lastErr: unknown;
  for (const model of MODELS) {
    try {
      return await callModel(model, imageBase64, mom, apiKey);
    } catch (err) {
      lastErr = err;
      if (!isBusy(err)) break; // quota, bad request, blocked photo: another model won't help
      console.error(`${model} is busy, trying the next model`);
    }
  }
  throw lastErr;
}
