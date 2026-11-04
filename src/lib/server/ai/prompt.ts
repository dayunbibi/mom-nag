// Prompt + output parsing shared by every AI provider
import { MOMS, type MomKey, type Nag } from "../../moms";

export type NagResult = Omit<Nag, "mock">;

export const USER_TEXT = "내 방이야. 잔소리해줘.";

export function systemPrompt(mom: MomKey) {
  return `너는 한국 엄마야. 자녀가 보낸 방 사진을 보고 잔소리를 해.
말투: ${MOMS[mom].style}

규칙:
- 사진에 실제로 보이는 물건을 콕 집어서 말해 (컵, 옷, 이불, 책상 위 물건 등). 안 보이는 걸 지어내지 마.
- 사람이 찍혀 있으면 그 사람은 무시해. 사람의 얼굴, 몸, 외모, 옷차림은 절대 언급하지 마.
- 방이나 공간 사진이 아니면 smash는 0으로 하고, "방 사진을 보내라"는 내용으로 장난스럽게 잔소리해.
- 욕설, 비하, 진짜로 상처 주는 말은 하지 마. 웃기고 정 있는 잔소리여야 해.
- 잔소리 한 줄은 40자 이내.

반드시 아래 JSON 하나만 출력해. 다른 말은 쓰지 마.
{"smash": 0~100 정수(방이 지저분할수록 높게), "title": "이 방에 붙일 짧은 별명(15자 이내)", "nags": ["잔소리1", "잔소리2", "잔소리3"], "praise": "잘한 점 하나, \\"그래도\\" 없이(30자 이내)"}`;
}

// Models sometimes wrap JSON in text or code fences, so grab the first {...} block
// and check every field instead of trusting it.
export function parseNag(text: string): NagResult {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("no JSON in model output");
  const raw = JSON.parse(match[0]);

  const nags = Array.isArray(raw.nags) ? raw.nags.filter((n: unknown) => typeof n === "string" && n.trim()) : [];
  if (nags.length === 0) throw new Error("no nags in model output");

  const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
  return {
    smash: Math.max(0, Math.min(100, Math.round(Number(raw.smash) || 0))),
    title: clip(String(raw.title || "엄마가 본 방"), 20),
    nags: nags.slice(0, 3).map((n: string) => clip(n.trim(), 50)),
    // the page already adds "그래도…" in front, so drop it if the model wrote it too
    praise: clip(String(raw.praise || "").replace(/^그래도[\s,.…]*/, "") || "사진은 잘 찍었네", 40),
  };
}
