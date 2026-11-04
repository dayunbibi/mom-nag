import { isMomKey, type Nag } from "@/lib/moms";
import { askMom, currentProvider } from "@/lib/server/ai";
import { mockNag } from "@/lib/server/mock";
import { allowRequest } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30; // seconds, the AI call can take a few

// the browser shrinks photos to 1024px JPEG first, so real requests are ~100-300KB
const MAX_IMAGE_CHARS = 2_000_000;

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!allowRequest(ip)) {
    return Response.json({ error: "엄마도 쉬어야 해요. 10분 뒤에 다시 해주세요." }, { status: 429 });
  }

  let body: { image?: unknown; mom?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "요청 형식이 이상해요." }, { status: 400 });
  }

  const { image, mom } = body;
  if (!isMomKey(mom)) {
    return Response.json({ error: "엄마 타입을 골라주세요." }, { status: 400 });
  }
  if (typeof image !== "string" || image.length < 100 || image.length > MAX_IMAGE_CHARS || !/^[A-Za-z0-9+/=]+$/.test(image)) {
    return Response.json({ error: "사진을 읽지 못했어요. 다른 사진으로 해주세요." }, { status: 400 });
  }

  const provider = currentProvider();

  // no key yet -> example answer, the page shows a "practice mode" note
  if (provider === "mock") {
    const nag: Nag = mockNag(mom);
    return Response.json(nag);
  }

  try {
    const nag: Nag = { ...(await askMom(provider, image, mom)), mock: false };
    return Response.json(nag);
  } catch (err) {
    console.error(`askMom (${provider}) failed`, err);
    const msg = err instanceof Error ? err.message : "";
    // 429 = free quota used up for today, 500/503 = the AI service is busy right now
    if (msg.endsWith(" 429")) {
      return Response.json({ error: "오늘 엄마가 너무 바빠요. 내일 다시 와주세요." }, { status: 503 });
    }
    if (msg.endsWith(" 503") || msg.endsWith(" 500")) {
      return Response.json({ error: "엄마가 지금 통화 중이에요. 1분 뒤에 다시 해주세요." }, { status: 503 });
    }
    return Response.json({ error: "엄마가 잠깐 전화 받으러 갔어요. 조금 있다 다시 해주세요." }, { status: 502 });
  }
}
