import type { MomKey } from "../../moms";
import { parseNag, systemPrompt, USER_TEXT, type NagResult } from "./prompt";

// All have a free tier and read images. Lite goes first because it answers fast.
// Free models get "high demand" (503) errors or just hang at busy times, so:
// retry lite once after a short pause (busy spikes are usually short), then move on
// to the other models, which seem to be busy at different times.
// Override the first choice with GEMINI_MODEL.
const FIRST = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const TRIES = [FIRST, FIRST, "gemini-3.8-flash", "gemini-3.6-flash"];

// everything has to fit inside the route's 30s limit (with a bit left for the DB call)
const BUDGET_MS = 26_000;
const TIMEOUT_MS = 12_000; // one slow try can't eat the whole budget
const PAUSE_MS = 1_500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

async function callModel(model: string, imageBase64: string, mom: MomKey, apiKey: string, timeoutMs: number): Promise<NagResult> {
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
    signal: AbortSignal.timeout(timeoutMs),
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
  const deadline = Date.now() + BUDGET_MS;
  let busyErr: unknown;

  for (const [i, model] of TRIES.entries()) {
    if (i > 0) await sleep(PAUSE_MS);
    const left = deadline - Date.now();
    if (left < 3_000) break; // not enough time for a real answer

    try {
      return await callModel(model, imageBase64, mom, apiKey, Math.min(TIMEOUT_MS, left));
    } catch (err) {
      // 404 = this model got renamed or retired. Skip it, but keep reporting "busy".
      if (err instanceof GeminiError && err.status === 404 && busyErr) continue;
      if (!isBusy(err)) throw err; // quota, bad request, blocked photo: another try won't help
      busyErr = err;
      console.error(`${model} is busy (try ${i + 1}/${TRIES.length})`);
    }
  }
  throw busyErr;
}
