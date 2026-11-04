"use client";

import { useEffect, useState } from "react";
import { MOMS, MOM_KEYS, smashLabel, type MomKey, type Nag } from "@/lib/moms";
import { shrinkPhoto } from "@/lib/photo";
import { makeResultImage } from "@/lib/resultImage";
import ShareCard from "./ShareCard";

type State =
  | { step: "idle" }
  | { step: "loading"; photo: string }
  | { step: "result"; photo: string; nag: Nag }
  | { step: "error"; photo: string | null; message: string };

export default function NagApp() {
  const [mom, setMom] = useState<MomKey>("blunt");
  const [state, setState] = useState<State>({ step: "idle" });
  const [card, setCard] = useState<{ url: string; blob: Blob } | null>(null);
  const [making, setMaking] = useState(false);
  const [stats, setStats] = useState<{ count: number; avg: number } | null>(null);

  // "오늘 등짝 맞은 사람" — hidden if the DB isn't connected
  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((s) => {
        if (typeof s.count === "number") setStats(s);
      })
      .catch(() => {});
  }, []);

  // add our own result right away instead of waiting for the 30s cache
  function bumpStats(smash: number) {
    setStats((s) => (s ? { count: s.count + 1, avg: Math.round((s.avg * s.count + smash) / (s.count + 1)) } : s));
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // so picking the same photo again still fires
    if (!file) return;

    let photo: { dataUrl: string; base64: string };
    try {
      photo = await shrinkPhoto(file);
    } catch {
      setState({ step: "error", photo: null, message: "이 사진은 못 읽었어요. JPG나 PNG 사진으로 해주세요." });
      return;
    }

    if (card) URL.revokeObjectURL(card.url);
    setCard(null);
    setState({ step: "loading", photo: photo.dataUrl });

    try {
      const res = await fetch("/api/nag", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: photo.base64, mom }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "잔소리를 못 받았어요.");
      setState({ step: "result", photo: photo.dataUrl, nag: data as Nag });
      if (!data.mock) bumpStats(data.smash);
    } catch (err) {
      const message = err instanceof Error && err.message !== "Failed to fetch" ? err.message : "인터넷 연결을 확인하고 다시 해주세요.";
      setState({ step: "error", photo: photo.dataUrl, message });
    }
  }

  async function makeCard() {
    if (state.step !== "result") return;
    setMaking(true);
    try {
      const blob = await makeResultImage(state.nag, mom, state.photo);
      setCard({ url: URL.createObjectURL(blob), blob });
    } finally {
      setMaking(false);
    }
  }

  function reset() {
    if (card) URL.revokeObjectURL(card.url);
    setCard(null);
    setState({ step: "idle" });
  }

  const busy = state.step === "loading";

  return (
    <div className="flex flex-col gap-6">
      {stats && stats.count > 0 && (
        <p className="m-0 self-start rounded-full bg-paper px-3.5 py-1.5 font-ui text-sm tabular-nums">
          오늘 등짝 맞은 사람 <b className="font-normal text-red">{stats.count}명</b> · 평균 지수 {stats.avg}
        </p>
      )}

      {/* 1. which mom */}
      <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0" disabled={busy || state.step === "result"}>
        <legend className="mb-2.5 font-ui text-lg">오늘은 어떤 엄마?</legend>
        <div className="grid grid-cols-3 gap-2">
          {MOM_KEYS.map((key) => (
            <label
              key={key}
              className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-xl border-2 bg-paper px-2 py-3 text-center transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ink ${
                mom === key ? "border-red" : "border-transparent"
              }`}
            >
              <input type="radio" name="mom" value={key} checked={mom === key} onChange={() => setMom(key)} className="sr-only" />
              <span className="text-2xl" aria-hidden="true">
                {MOMS[key].emoji}
              </span>
              <span className="font-ui text-[15px]">{MOMS[key].name}</span>
              <span className="text-xs text-ink-dim">{MOMS[key].desc}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* 2. photo */}
      {state.step === "idle" && (
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-[3px] border-dashed border-line bg-paper/60 px-4 py-10 text-center has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ink">
          <input type="file" accept="image/*" onChange={onFile} className="sr-only" />
          <span className="text-4xl" aria-hidden="true">
            📸
          </span>
          <span className="font-sign text-2xl">방 사진 올리기</span>
          <span className="text-sm text-ink-dim">책상, 침대, 옷 쌓인 의자 다 좋아요</span>
        </label>
      )}

      {busy && (
        <div className="flex flex-col items-center gap-4" aria-live="polite">
          {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
          <img src={state.photo} alt="올린 방 사진" className="w-full rotate-[-1.5deg] rounded-sm border-[10px] border-paper opacity-70 shadow-lg" />
          <p className="m-0 font-ui text-xl">
            {MOMS[mom].emoji} 엄마가 방 둘러보는 중<span className="dots" />
          </p>
        </div>
      )}

      {state.step === "error" && (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-paper p-6 text-center" role="alert">
          <p className="m-0 font-ui text-lg">{state.message}</p>
          <button className="btn" onClick={reset}>
            다시 해보기
          </button>
        </div>
      )}

      {state.step === "result" && (
        <section className="flex flex-col gap-5" aria-live="polite">
          {state.nag.mock && (
            <p className="m-0 rounded-lg bg-ink px-3 py-2 text-center text-sm text-paper">
              연습 모드예요. 아직 AI가 연결 안 돼서 사진을 안 보고 예시 잔소리를 보여줘요.
            </p>
          )}

          <figure className="m-0 rotate-[-1.5deg] bg-paper p-2.5 pb-3 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
            <img src={state.photo} alt="올린 방 사진" className="block w-full" />
            <figcaption className="pt-2.5 text-center font-sign text-xl">{state.nag.title}</figcaption>
          </figure>

          <div className="flex flex-col gap-2.5">
            <p className="m-0 font-ui text-sm text-ink-dim">
              {MOMS[mom].emoji} {MOMS[mom].name}
            </p>
            {state.nag.nags.map((text, i) => (
              <p key={i} className="bubble m-0" style={{ animationDelay: `${i * 0.6}s` }}>
                {text}
              </p>
            ))}
            <p className="bubble bubble-soft m-0" style={{ animationDelay: `${state.nag.nags.length * 0.6}s` }}>
              그래도… {state.nag.praise}
            </p>
          </div>

          <div className="rounded-2xl bg-paper p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-ui">등짝 스매싱 지수</span>
              <span className="font-sign text-3xl text-red tabular-nums">{state.nag.smash}</span>
            </div>
            <div className="mt-2 h-3.5 overflow-hidden rounded-full bg-floor">
              <div className="h-full rounded-full bg-red" style={{ width: `${state.nag.smash}%` }} />
            </div>
            <p className="m-0 mt-1.5 text-right text-sm text-ink-dim">{smashLabel(state.nag.smash)}</p>
          </div>

          {card ? (
            <ShareCard url={card.url} blob={card.blob} smash={state.nag.smash} />
          ) : (
            <button className="btn btn-big" onClick={makeCard} disabled={making}>
              {making ? "카드 만드는 중…" : "결과 카드 만들기"}
            </button>
          )}
          <button className="btn btn-ghost" onClick={reset}>
            다른 사진 올리기
          </button>
        </section>
      )}
    </div>
  );
}
