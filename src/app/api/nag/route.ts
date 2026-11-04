import { isMomKey, type Nag } from "@/lib/moms";
import { askMom } from "@/lib/server/askMom";
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

  // no key yet -> example answer, the page shows a "practice mode" note
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const nag: Nag = mockNag(mom);
    return Response.json(nag);
  }

  try {
    const nag: Nag = { ...(await askMom(image, mom, apiKey)), mock: false };
    return Response.json(nag);
  } catch (err) {
    console.error("askMom failed", err);
    return Response.json({ error: "엄마가 잠깐 전화 받으러 갔어요. 조금 있다 다시 해주세요." }, { status: 502 });
  }
}
