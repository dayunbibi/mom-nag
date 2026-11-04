import type { MomKey } from "../../moms";
import { parseNag, systemPrompt, USER_TEXT, type NagResult } from "./prompt";

// Haiku is Claude's fastest and cheapest model and it can read images
const MODEL = process.env.CLAUDE_MODEL || "claude-haiku-5-5";

export async function askClaude(imageBase64: string, mom: MomKey, apiKey: string): Promise<NagResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      system: systemPrompt(mom),
      messages: [
        {
          role: "user",
          content: [
            // image first, then the text (recommended order in the docs)
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
            { type: "text", text: USER_TEXT },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(25_000),
  });

  if (!res.ok) {
    // log the details on the server, never send them to the browser
    console.error("Claude API error", res.status, await res.text());
    throw new Error(`Claude API ${res.status}`);
  }

  const data = await res.json();
  const text = (data.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");
  return parseNag(text);
}
