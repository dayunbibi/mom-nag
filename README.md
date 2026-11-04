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
- **Input checks**: mom type must be one of three, the image must be base64 and under a size cap.
- **Rate limit** (`src/lib/server/rateLimit.ts`): 5 requests per IP per 10 minutes.
  It's in memory, so each serverless instance counts separately — moving it to a database is the next step.
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
- Canvas 2D for the share card

## Running locally

```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY (free) or ANTHROPIC_API_KEY, or leave both empty for practice mode
npm run dev
```

## Next steps

- Move the rate limit and a "today n people got 등짝" counter into Supabase
- Daily request cap so a viral day can't hit the free-tier limit (or the bill) all at once
