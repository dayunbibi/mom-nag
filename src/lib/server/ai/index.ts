// Picks which AI answers, based on env vars. Switching = change env + redeploy, no code changes.
//
//   AI_PROVIDER=gemini | claude   (optional, otherwise whichever key exists)
//   GEMINI_API_KEY / ANTHROPIC_API_KEY
//
// With no key at all the app runs in practice mode.
import type { MomKey } from "../../moms";
import { askClaude } from "./claude";
import { askGemini } from "./gemini";
import type { NagResult } from "./prompt";

export type Provider = "gemini" | "claude" | "mock";

export function currentProvider(): Provider {
  const wanted = process.env.AI_PROVIDER;
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasClaude = !!process.env.ANTHROPIC_API_KEY;

  if (wanted === "gemini" && hasGemini) return "gemini";
  if (wanted === "claude" && hasClaude) return "claude";
  if (hasClaude) return "claude";
  if (hasGemini) return "gemini";
  return "mock";
}

export async function askMom(provider: "gemini" | "claude", imageBase64: string, mom: MomKey): Promise<NagResult> {
  if (provider === "gemini") return askGemini(imageBase64, mom, process.env.GEMINI_API_KEY!);
  return askClaude(imageBase64, mom, process.env.ANTHROPIC_API_KEY!);
}
