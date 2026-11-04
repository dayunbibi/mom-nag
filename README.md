# 📸 AI 엄마 잔소리 (AI Mom Nag)

Upload a photo of your room and an AI "Korean mom" points at the actual things she sees —
the cup on the desk, the clothes on the chair — and nags you about them, with a 등짝 스매싱 지수 (back-slap score) from 0 to 100.

Part of [향수병 게임즈](https://homesick-games.vercel.app), small web apps I make in Toronto because I miss home. Yes, even the nagging.

## How it works

```
phone photo ──► browser shrinks it to 1024px JPEG ──► POST /api/nag ──► Claude Haiku 5.5 (vision)
                                                         │                    │
                                       validate + rate limit           strict JSON reply
                                                         ▼                    │
                                               parse & sanity-check ◄─────────┘
                                                         ▼
                                       chat bubbles + score + 9:16 share card
```

- **Shrinking in the browser** (`src/lib/photo.ts`): phone photos are 3–10 MB. Resizing to 1024px before upload
  makes the request ~100–300 KB, the AI call faster and cheaper, and the full-size photo never leaves the phone.
- **API key stays on the server** (`src/app/api/nag/route.ts`): the browser only talks to my own route,
  which is the only place `ANTHROPIC_API_KEY` is read.
- **Input checks**: mom type must be one of three, the image must be base64 and under a size cap.
- **Rate limit** (`src/lib/server/rateLimit.ts`): 5 requests per IP per 10 minutes.
  It's in memory, so each serverless instance counts separately — moving it to a database is the next step.
- **Don't trust model output** (`parseNag` in `src/lib/server/askMom.ts`): pulls the JSON out even if it's wrapped
  in text or code fences, clamps the score to 0–100, keeps at most 3 nags, trims long lines.
- **Prompt rules**: only talk about objects that are actually visible, never comment on a person's face, body or
  clothes, keep it funny instead of hurtful, and ask for a room photo if the picture isn't one.
- **Privacy**: photos aren't stored anywhere. They're sent once for the reply and that's it.
- **Practice mode**: without an API key the route returns example nags (`src/lib/server/mock.ts`)
  and the page says so, so the app can be developed and demoed with no key.

## Tech

- Next.js 15 (App Router, Route Handler) + TypeScript
- Tailwind CSS v4
- Claude API (Messages API with an image block), called with plain `fetch`
- Canvas 2D for the share card

## Running locally

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY, or leave it empty for practice mode
npm run dev
```

## Next steps

- Move the rate limit and a "today n people got 등짝" counter into Supabase
- Daily spending cap so a viral day can't run up the API bill
