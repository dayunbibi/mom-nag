import { isMomKey, type MomKey, type Nag } from "@/lib/moms";
import { askMom, currentProvider } from "@/lib/server/ai";
import { dbEnabled, finishNag, hashIp, tryNag } from "@/lib/server/db";
import { mockNag } from "@/lib/server/mock";
import { allowRequest } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30; // seconds, the AI call can take a few

// the browser shrinks photos to 1024px JPEG first, so real requests are ~100-300KB
const MAX_IMAGE_CHARS = 2_000_000;

const TOO_MANY = { error: "엄마도 쉬어야 해요. 10분 뒤에 다시 해주세요." };
const SOLD_OUT = { error: "오늘 엄마가 너무 바빠요. 내일 다시 와주세요." };

// Returns the DB row id to fill in later, or a Response if the request is blocked.
// If Supabase is down we fall back to the in-memory limit instead of blocking everyone.
async function checkLimits(ip: string, mom: MomKey): Promise<number | null | Response> {
  if (dbEnabled()) {
    try {
      const r = await tryNag(hashIp(ip), mom);
      if (r.allowed) return r.id;
      return Response.json(r.reason === "daily" ? SOLD_OUT : TOO_MANY, { status: r.reason === "daily" ? 503 : 429 });
    } catch (err) {
      console.error("Supabase limit check failed, using memory limit", err);
    }
  }
  return allowRequest(ip) ? null : Response.json(TOO_MANY, { status: 429 });
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";

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

  // limits only count requests that passed the checks above
  const limit = await checkLimits(ip, mom);
  if (limit instanceof Response) return limit;
  const rowId = limit;

  const provider = currentProvider();

  let nag: Nag;
  if (provider === "mock") {
    // no AI key yet -> example answer, the page shows a "practice mode" note
    nag = mockNag(mom);
  } else {
    try {
      nag = { ...(await askMom(provider, image, mom)), mock: false };
    } catch (err) {
      console.error(`askMom (${provider}) failed`, err);
      const msg = err instanceof Error ? err.message : "";
      // 429 = free quota used up for today, 500/503/timeout = the AI service is busy right now
      if (msg.endsWith(" 429")) return Response.json(SOLD_OUT, { status: 503 });
      if (msg.endsWith(" 503") || msg.endsWith(" 500") || (err instanceof Error && err.name === "TimeoutError")) {
        return Response.json({ error: "엄마가 지금 통화 중이에요. 1분 뒤에 다시 해주세요." }, { status: 503 });
      }
      return Response.json({ error: "엄마가 잠깐 전화 받으러 갔어요. 조금 있다 다시 해주세요." }, { status: 502 });
    }
  }

  // save the score for today's stats; if this fails the user still gets their nag
  if (rowId !== null) {
    await finishNag(rowId, nag.smash, provider).catch((err) => console.error("finishNag failed", err));
  }

  return Response.json(nag);
}
