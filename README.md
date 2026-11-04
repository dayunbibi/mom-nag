# 📸 AI 엄마 잔소리 (AI Mom Nag)

Upload a photo of your room and an AI "Korean mom" points at the actual things she sees —
the cup on the desk, the clothes on the chair — and nags you about them, with a 등짝 스매싱 지수 (back-slap score) from 0 to 100.

Part of [향수병 게임즈](https://homesick-games.vercel.app), small web apps I make in Toronto because I miss home. Yes, even the nagging.

## How it works

```
phone photo ──► browser shrinks it to 1024px JPEG ──► POST /api/nag ──► Gemini or Claude (vision)
                                                         │                    │
                                       validate + rate limit           strict JSON reply
                                                         ▼                    │
                                               parse & sanity-check ◄─────────┘
                                                         ▼
                                       chat bubbles + score + 9:16 share card
```

- **Shrinking in the browser** (`src/lib/photo.ts`): phone photos are 3–10 MB. Resizing to 1024px before upload
  makes the request ~100–300 KB, the AI call faster and cheaper, and the full-size photo never leaves the phone.
- **API keys stay on the server** (`src/app/api/nag/route.ts`): the browser only talks to my own route.
- **Swappable AI provider** (`src/lib/server/ai/`): one shared prompt + parser, and a small file per provider
  (`gemini.ts`, `claude.ts`). `currentProvider()` picks one from env vars, so switching is "change env, redeploy".
  Gemini is the default because it has a free tier; Claude Haiku 5.5 is the paid option.
- **Busy free models**: in the first live test, the main Gemini model returned 503 "high demand" and then timed out.
  Now it tries `gemini-3.5-flash-lite` first (fast) and falls back to `gemini-3.8-flash` on 500/503/timeout,
  each with a 12s limit so both fit in the 30s function limit. A 429 (quota) doesn't retry, since another model won't help.
- **Input checks**: mom type must be one of three, the image must be base64 and under a size cap.
- **Rate limits in Postgres** (`supabase/schema.sql`, `src/lib/server/db.ts`): 5 requests per person per 10 minutes,
  plus a daily cap for everyone (default 300) so a viral day can't burn through the free AI quota.
  `try_nag()` checks both limits and inserts the row in **one** call, with an advisory lock per person,
  so two taps at the same moment can't both sneak under the limit. (The first version kept counts in memory,
  which doesn't work on serverless: every instance had its own count.)
- **Privacy in the DB**: the IP is stored only as an HMAC-SHA256 hash keyed with the server secret, so it can't be
  reversed or matched against a list. Stored per request: hash, mom type, score, which AI. No photos, no nag text.
  Rows older than 30 days are cleaned up.
- **Locked-down table**: RLS is on with no policies and grants are revoked from the public roles,
  so only the server's secret key can read or write. The SQL functions are also only executable by the server.
- **Graceful fallback**: if Supabase is unreachable, the route falls back to the in-memory limit
  (`src/lib/server/rateLimit.ts`) and the counter hides itself, instead of the whole app going down.
- **"오늘 등짝 맞은 사람 n명"** (`/api/stats`): cached at Vercel's edge for 30s so busy traffic doesn't hit the DB
  on every page view; the page adds your own result right away.
- **Don't trust model output** (`parseNag` in `src/lib/server/askMom.ts`): pulls the JSON out even if it's wrapped
  in text or code fences, clamps the score to 0–100, keeps at most 3 nags, trims long lines.
- **Prompt rules**: only talk about objects that are actually visible, never comment on a person's face, body or
  clothes, keep it funny instead of hurtful, and ask for a room photo if the picture isn't one.
- **Honest privacy note**: the app never stores photos, but the page text changes with the provider.
  On Gemini's free tier, Google may use what's sent to improve its products, so the page says exactly that
  and asks people not to upload photos with faces or addresses.
- **Practice mode**: without an API key the route returns example nags (`src/lib/server/mock.ts`)
  and the page says so, so the app can be developed and demoed with no key.

## Tech

- Next.js 15 (App Router, Route Handler) + TypeScript
- Tailwind CSS v4
- Gemini API (`generateContent` with inline image) or Claude API (Messages API with an image block), both with plain `fetch`
- Supabase (Postgres) through its REST API with plain `fetch` — SQL functions instead of an ORM
- Canvas 2D for the share card

## Running locally

```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY (free) or ANTHROPIC_API_KEY, or leave both empty for practice mode
# optional: create a Supabase project, run supabase/schema.sql in its SQL Editor,
# then add SUPABASE_URL and SUPABASE_SECRET_KEY
npm run dev
```

## Things that went wrong (and the fix)

- **Gemini 503 / timeouts** on the first live calls → lite model first, fall back on 500/503/timeout (see above).
- **A secret ended up in the logs.** During setup the Supabase secret key was pasted into `SUPABASE_URL` by mistake.
  `fetch` then threw `Failed to parse URL from <that value>/rest/v1/...`, and my error logging printed it.
  Fixes: rotated the key right away (new key, old one deleted), `db.ts` now validates the config at startup
  and turns the DB off with a warning that never prints the values, and fetch errors are re-thrown with only
  the error type. Lesson: treat error messages from code that touches secrets as possibly containing them.

## Testing

- The SQL was tested against real Postgres running in memory (PGlite): per-person limit, daily cap,
  yesterday's rows not counting, stats, and that the public roles can't read the table or call the functions.
- The full app was tested against a small fake Supabase REST server backed by that same Postgres,
  including Supabase being down.

## Next steps

- "이번 주 등짝 랭킹" — most-nagged mom type of the week
