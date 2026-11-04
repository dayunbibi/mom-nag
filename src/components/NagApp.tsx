"use client";

import { useEffect, useRef, useState } from "react";
import { MOMS, MOM_KEYS, STAGES, STAGE_CUTS, stageIndex, type MomKey, type Nag } from "@/lib/moms";
import { shrinkPhoto } from "@/lib/photo";
import { makeResultImage } from "@/lib/resultImage";
import ShareCard from "./ShareCard";

type Photo = { dataUrl: string; base64: string };

type State =
  | { step: "idle" }
  | { step: "loading"; photo: Photo }
  | { step: "result"; photo: Photo; nag: Nag }
  | { step: "error"; photo: Photo | null; message: string };

type Props = { privacy: string; practice: boolean };

const LOADING_LINES = ["침대 밑부터 보는 중", "컵 개수 세는 중", "의자 위 옷 무더기 발견", "창틀 먼지 손가락으로 쓸어보는 중"];

function reducedMotion() {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function NagApp({ privacy, practice }: Props) {
  const [mom, setMom] = useState<MomKey>("blunt");
  const [state, setState] = useState<State>({ step: "idle" });
  const [card, setCard] = useState<{ url: string; blob: Blob } | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [making, setMaking] = useState(false);
  const [stats, setStats] = useState<{ count: number; avg: number } | null>(null);
  const [drag, setDrag] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const focusRef = useRef<HTMLElement>(null); // heading of the current screen
  const uploadRef = useRef<HTMLElement>(null);
  const cardBtnRef = useRef<HTMLButtonElement>(null);
  const requestId = useRef(0); // ignore answers that come back after the user went home
  const goToUpload = useRef(false);

  // "오늘 등짝 맞은 사람" — hidden if the DB isn't connected
  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((s) => {
        if (typeof s.count === "number") setStats(s);
      })
      .catch(() => {});
  }, []);

  // new screen -> back to the top, and move focus there so screen readers follow
  useEffect(() => {
    if (state.step === "idle" && goToUpload.current) {
      goToUpload.current = false;
      uploadRef.current?.scrollIntoView();
      return;
    }
    window.scrollTo(0, 0);
    if (state.step !== "idle") focusRef.current?.focus({ preventScroll: true });
  }, [state.step]);

  // add our own result right away instead of waiting for the 30s cache
  function bumpStats(smash: number) {
    setStats((s) => (s ? { count: s.count + 1, avg: Math.round((s.avg * s.count + smash) / (s.count + 1)) } : s));
  }

  function clearCard() {
    if (card) URL.revokeObjectURL(card.url);
    setCard(null);
    setCardOpen(false);
  }

  async function ask(photo: Photo) {
    const id = ++requestId.current;
    clearCard();
    setState({ step: "loading", photo });

    try {
      const res = await fetch("/api/nag", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: photo.base64, mom }),
      });
      const data = await res.json();
      if (id !== requestId.current) return;
      if (!res.ok) throw new Error(data.error || "잔소리를 못 받았어요.");
      setState({ step: "result", photo, nag: data as Nag });
      if (!data.mock) bumpStats(data.smash);
    } catch (err) {
      if (id !== requestId.current) return;
      const message = err instanceof Error && err.message !== "Failed to fetch" ? err.message : "인터넷 연결을 확인하고 다시 해주세요.";
      setState({ step: "error", photo, message });
    }
  }

  async function pickFile(file: File | undefined) {
    if (!file) return;
    let photo: Photo;
    try {
      photo = await shrinkPhoto(file);
    } catch {
      setState({ step: "error", photo: null, message: "이 사진은 못 읽었어요. JPG나 PNG 사진으로 해주세요." });
      return;
    }
    ask(photo);
  }

  async function openCard() {
    if (state.step !== "result") return;
    if (!card) {
      setMaking(true);
      try {
        const blob = await makeResultImage(state.nag, mom, state.photo.dataUrl);
        setCard({ url: URL.createObjectURL(blob), blob });
      } finally {
        setMaking(false);
      }
    }
    setCardOpen(true);
  }

  function goHome(toUpload = false) {
    requestId.current++;
    clearCard();
    goToUpload.current = toUpload;
    setState({ step: "idle" });
  }

  const showBand = practice || (state.step === "result" && state.nag.mock);

  return (
    <>
      {showBand && (
        <div role="status" className="flex items-start gap-2.5 bg-meok px-[18px] py-2.5 text-caption leading-[1.45] text-jangpan-hover">
          <span className="mt-px flex-none border-[1.5px] border-jangpan px-1.5 py-px text-[11px] font-bold text-jangpan">연습 모드</span>
          <span>아직 AI가 연결 안 돼서 사진을 안 보고 예시 잔소리를 보여줘요.</span>
        </div>
      )}

      {state.step === "idle" ? (
        <>
          <header className="border-b-2 border-meok bg-jangpan-grid px-gutter py-6">
            <p className="m-0 font-mono text-[11px] tracking-[.06em]">
              MOM-NAG <span className="font-sans font-medium tracking-normal text-meok-mid">· 토론토에서 엄마 잔소리마저 그리워서 만든</span>
            </p>
            <h1 className="m-0 mt-[18px] font-display text-display-xl font-normal tracking-[-.01em]">
              AI 엄마
              <br />
              <span className="text-daeya">잔소리</span>
            </h1>
            <p className="m-0 mt-4 max-w-[310px] text-body-l font-medium text-pretty">방 사진 한 장 올리면 엄마가 보이는 것마다 한마디 해요.</p>
            {stats && (
              <dl className="m-0 mt-5 grid grid-cols-2 border-2 border-meok bg-hanji">
                <div className="border-r-2 border-meok px-3 py-2.5">
                  <dt className="text-xs font-medium text-meok-soft">오늘 등짝 맞은 사람</dt>
                  <dd className="m-0 mt-1 font-display text-[26px] leading-[1.1] tabular-nums">
                    {stats.count.toLocaleString("ko-KR")}
                    <span className="ml-0.5 font-sans text-sm font-bold">명</span>
                  </dd>
                </div>
                <div className="px-3 py-2.5">
                  <dt className="text-xs font-medium text-meok-soft">평균 지수</dt>
                  <dd className="m-0 mt-1 font-display text-[26px] leading-[1.1] tabular-nums">
                    {stats.count > 0 ? stats.avg : "–"}
                    <span className="ml-0.5 font-sans text-sm font-bold">점</span>
                  </dd>
                </div>
              </dl>
            )}
            <p className="m-0 mt-3.5 text-caption text-pretty text-meok-mid">
              <strong className="text-meok">사진 안내</strong> {privacy}
            </p>
          </header>

          <section className="px-gutter pt-7 pb-1">
            <SectionTitle n="01" id="pick-title">
              누가 잔소리할까요?
            </SectionTitle>
            <div role="radiogroup" aria-labelledby="pick-title" className="mt-3.5 flex flex-col gap-2.5">
              {MOM_KEYS.map((key) => (
                <MomOption key={key} momKey={key} checked={mom === key} onSelect={setMom} />
              ))}
            </div>
          </section>

          <section ref={uploadRef} className="scroll-mt-4 px-gutter pt-[26px] pb-[34px]">
            <SectionTitle n="02">엄마한테 방 보여주기</SectionTitle>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              tabIndex={-1}
              aria-hidden="true"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = ""; // so picking the same photo again still fires
                pickFile(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                pickFile(e.dataTransfer.files[0]);
              }}
              className={`mt-3.5 flex min-h-[236px] w-full flex-col items-center justify-center gap-4 rounded-ui border-[2.5px] p-6 transition-colors hover:bg-jangpan-hover ${
                drag ? "border-solid border-daeya bg-jangpan-hover" : "border-dashed border-meok bg-paper"
              }`}
            >
              <span className="font-display text-display-m leading-[1.12] whitespace-pre-line">
                {drag ? "여기 놓으면\n엄마가 봐요" : "방 사진 한 장\n보여줘 봐"}
              </span>
              <span className="rounded-ui border-2 border-meok bg-daeya px-[22px] py-3 text-base font-bold text-white shadow-hard-sm">방 사진 고르기</span>
              <span className="text-xs text-meok-soft">JPG · PNG 한 장 · 끌어다 놓아도 돼요</span>
            </button>
          </section>
        </>
      ) : (
        <header className="flex items-center justify-between gap-3 border-b-2 border-meok bg-jangpan-grid px-[18px] py-3">
          <button type="button" onClick={() => goHome()} aria-label="처음으로" className="min-h-11 py-1 font-display text-[22px]">
            AI 엄마 <span className="text-daeya">잔소리</span>
          </button>
          <span className="rounded-[2px] border-2 border-meok bg-hanji px-2.5 py-1 text-caption font-bold">{MOMS[mom].name}</span>
        </header>
      )}

      {state.step === "loading" && <Loading photo={state.photo.dataUrl} focusRef={focusRef} />}

      {state.step === "result" && (
        <Result
          key={state.nag.title + state.nag.smash}
          nag={state.nag}
          mom={mom}
          photo={state.photo.dataUrl}
          focusRef={focusRef}
          cardBtnRef={cardBtnRef}
          making={making}
          onCard={openCard}
          onAgain={() => goHome(true)}
        />
      )}

      {state.step === "error" && (
        <section role="alert" className="px-gutter pt-9 pb-10">
          <div className="inline-block rotate-[-4deg] border-[3px] border-daeya px-3 pt-1 pb-1.5 font-display text-lg text-daeya">통화 중</div>
          <h2 ref={focusRef as React.RefObject<HTMLHeadingElement>} tabIndex={-1} className="m-0 mt-[18px] font-display text-display-l font-normal">
            엄마가 지금
            <br />
            통화 중이에요.
          </h2>
          <p className="m-0 mt-3.5 text-base leading-[1.55] text-pretty text-meok-mid">
            {/* the busy message starts with the same sentence as the title */}
            {state.message.replace(/^엄마가 지금 통화 중이에요\.\s*/, "")}
          </p>
          {state.photo && (
            <div className="mt-[22px] flex items-center gap-3 border-y-2 border-meok py-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
              <img src={state.photo.dataUrl} alt="" className="size-14 flex-none border-2 border-meok object-cover" />
              <span className="text-sm leading-[1.45]">다시 해보기를 누르면 이 사진 그대로 엄마한테 다시 보여드려요.</span>
            </div>
          )}
          <div className="mt-6 flex flex-col gap-3">
            {state.photo && (
              <button type="button" className="btn-red" onClick={() => ask(state.photo!)}>
                다시 해보기
              </button>
            )}
            <button type="button" className="btn-sub" onClick={() => goHome(true)}>
              다른 사진 고르기
            </button>
          </div>
        </section>
      )}

      {cardOpen && card && state.step === "result" && (
        <ShareCard
          url={card.url}
          blob={card.blob}
          smash={state.nag.smash}
          onClose={() => {
            setCardOpen(false);
            cardBtnRef.current?.focus();
          }}
        />
      )}
    </>
  );
}

function SectionTitle({ n, id, children }: { n: string; id?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span className="font-display text-[15px] text-daeya">{n}</span>
      <h2 id={id} className="m-0 text-xl font-bold tracking-[-.02em]">
        {children}
      </h2>
    </div>
  );
}

function MomOption({ momKey, checked, onSelect }: { momKey: MomKey; checked: boolean; onSelect: (k: MomKey) => void }) {
  const m = MOMS[momKey];
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={() => onSelect(momKey)}
      onKeyDown={(e) => {
        // arrow keys move between moms like a normal radio group
        const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        const next = MOM_KEYS[(MOM_KEYS.indexOf(momKey) + step + MOM_KEYS.length) % MOM_KEYS.length];
        onSelect(next);
        (e.currentTarget.parentElement?.querySelector(`[data-mom="${next}"]`) as HTMLElement | null)?.focus();
      }}
      tabIndex={checked ? 0 : -1}
      data-mom={momKey}
      className={`flex w-full items-center gap-3.5 rounded-ui border-2 border-meok px-3.5 py-[13px] text-left transition-[background-color,box-shadow] duration-150 ${
        checked ? "bg-meok text-hanji shadow-hard-red" : "bg-paper text-meok"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static svg, next/image adds nothing here */}
      <img src={m.avatar} alt="" width={44} height={44} className="size-11 flex-none" />
      <span className="min-w-0 flex-1">
        <span className="block text-body-l font-bold">{m.name}</span>
        <span className="mt-0.5 block text-sm leading-[1.4]">&ldquo;{m.sample}&rdquo;</span>
      </span>
      <span aria-hidden="true" className={`grid size-[22px] flex-none place-items-center rounded-full border-2 ${checked ? "border-hanji" : "border-meok"}`}>
        <span className={`size-2.5 rounded-full ${checked ? "bg-jangpan" : ""}`} />
      </span>
    </button>
  );
}

function Loading({ photo, focusRef }: { photo: string; focusRef: React.RefObject<HTMLElement | null> }) {
  const [line, setLine] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setLine((l) => (l + 1) % LOADING_LINES.length), 900);
    return () => clearInterval(iv);
  }, []);

  return (
    <section aria-live="polite" className="px-gutter pt-6 pb-10">
      <div className="relative aspect-[4/5] max-w-full overflow-hidden border-2 border-meok bg-placeholder shadow-photo">
        {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
        <img src={photo} alt="올린 방 사진" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-meok/14" />
        <div className="motion-loop absolute inset-x-0 top-0 h-1 animate-scan bg-daeya" />
        <span className="absolute top-2.5 left-2.5 bg-meok px-2 py-1 text-[11px] font-bold text-jangpan">엄마 시점</span>
      </div>
      <p ref={focusRef as React.RefObject<HTMLParagraphElement>} tabIndex={-1} className="m-0 mt-6 font-display text-display-m">
        엄마가 방
        <br />
        둘러보는 중…
      </p>
      <p className="m-0 mt-2 min-h-[22px] text-[15px] text-meok-soft" aria-hidden="true">
        {LOADING_LINES[line]}
      </p>
      <div className="relative mt-4 h-3 overflow-hidden border-2 border-meok bg-paper" role="progressbar" aria-label="잔소리 준비 중">
        <div className="motion-loop absolute inset-y-0 w-[35%] animate-slide bg-meok" />
      </div>
    </section>
  );
}

type ResultProps = {
  nag: Nag;
  mom: MomKey;
  photo: string;
  focusRef: React.RefObject<HTMLElement | null>;
  cardBtnRef: React.RefObject<HTMLButtonElement | null>;
  making: boolean;
  onCard: () => void;
  onAgain: () => void;
};

function Result({ nag, mom, photo, focusRef, cardBtnRef, making, onCard, onAgain }: ResultProps) {
  // reveal one bubble at a time: 3 nags, then the praise, then the score counts up
  const [shown, setShown] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const finalStage = stageIndex(nag.smash);
  const stage = STAGES[stageIndex(score)];

  useEffect(() => {
    const reduced = reducedMotion();
    const gap = reduced ? 200 : 950;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let raf = 0;

    [1, 2, 3, 4].forEach((n, i) => timers.push(setTimeout(() => setShown(n), 400 + i * gap)));

    timers.push(
      setTimeout(() => {
        const t0 = performance.now();
        const dur = reduced ? 1 : 1300;
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / dur);
          setScore(Math.round(nag.smash * (1 - Math.pow(1 - p, 3)))); // easeOutCubic
          if (p < 1) {
            raf = requestAnimationFrame(tick);
            return;
          }
          setDone(true);
          if (finalStage >= 2) navigator.vibrate?.(finalStage === 3 ? [60, 40, 120] : 50);
          requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "end" }));
        };
        raf = requestAnimationFrame(tick);
      }, 400 + 4 * gap),
    );

    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
    };
  }, [nag.smash, finalStage]);

  const showPalm = done && finalStage === 3;

  return (
    <>
      <section className="px-gutter pt-6 pb-1">
        <div className="relative mb-[52px]">
          <div className="relative aspect-[4/3] max-w-full rotate-[-1deg] overflow-hidden border-2 border-meok bg-placeholder shadow-photo">
            {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
            <img src={photo} alt="올린 방 사진" className="absolute inset-0 size-full object-cover" />
            {showPalm && (
              // eslint-disable-next-line @next/next/no-img-element -- static svg
              <img
                src="/illustrations/palm-mark.svg"
                alt=""
                width={118}
                height={140}
                className="absolute top-3 right-[18px] h-[140px] w-[118px] rotate-[-14deg] animate-slam"
              />
            )}
          </div>
          <div className="absolute -bottom-10 left-3 max-w-[calc(100%-24px)] rotate-2 border-2 border-meok bg-daeya px-3.5 pt-2 pb-2.5 text-white shadow-hard-sm">
            <div className="text-[11px] font-bold tracking-[.06em]">방 별명</div>
            <div className="mt-0.5 font-display text-[28px] leading-[1.05] break-keep">{nag.title}</div>
          </div>
        </div>

        <div aria-live="polite" className="flex flex-col gap-3">
          <p ref={focusRef as React.RefObject<HTMLParagraphElement>} tabIndex={-1} className="m-0 flex items-center gap-2 text-caption font-bold">
            {/* eslint-disable-next-line @next/next/no-img-element -- static svg */}
            <img src={MOMS[mom].avatar} alt="" width={30} height={30} className="size-[30px]" />
            {MOMS[mom].name}
          </p>
          {nag.nags.slice(0, Math.min(shown, 3)).map((text, i) => (
            <p key={i} className="bubble animate-pop self-start">
              {text}
            </p>
          ))}
          {shown < 4 && (
            <div aria-label="엄마가 말하는 중" className="flex gap-[5px] self-start rounded-[16px_16px_16px_4px] border-2 border-meok bg-paper px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span key={i} className="motion-loop size-[7px] animate-blink rounded-full bg-meok" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}
          {shown >= 4 && (
            <div className="max-w-[88%] animate-pop self-end">
              <div className="mb-1 text-right text-caption font-bold text-towel-ink">그래도…</div>
              <p className="bubble max-w-none rounded-[16px_16px_4px_16px] bg-towel text-white">{nag.praise}</p>
            </div>
          )}
        </div>
      </section>

      {shown >= 4 && (
        <section className={`mx-gutter mt-7 border-t-2 border-meok pt-[18px] ${done && finalStage >= 2 ? "animate-shake" : ""}`}>
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-sm font-bold">등짝 스매싱 지수</div>
              {done && (
                <div
                  className="mt-2.5 inline-block animate-slam border-2 border-meok px-3 pt-1 pb-[7px] font-display text-2xl text-white shadow-hard-sm"
                  style={{ background: STAGES[finalStage].color }}
                >
                  {STAGES[finalStage].name}
                </div>
              )}
            </div>
            <div className="font-display text-score tracking-[-.02em] tabular-nums">
              {score}
              <span className="ml-0.5 text-xl">/100</span>
            </div>
          </div>
          <div
            role="meter"
            aria-label="등짝 스매싱 지수"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={score}
            aria-valuetext={`${score}점, ${stage.name}`}
            className="relative mt-4 h-[18px] overflow-hidden border-2 border-meok bg-paper"
          >
            <div className="absolute inset-y-0 left-0" style={{ width: `${score}%`, background: stage.color }} />
            {STAGE_CUTS.map((cut) => (
              <div key={cut} className="absolute inset-y-0 w-0.5 bg-meok/35" style={{ left: `${cut}%` }} />
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-4 text-[11px] leading-[1.3]" aria-hidden="true">
            {STAGES.map((st) => (
              <span key={st.name} className={st === stage ? "font-bold text-meok" : "text-meok-soft"}>
                {st.name}
              </span>
            ))}
          </div>
        </section>
      )}

      <div ref={endRef} className={`flex flex-col gap-3 px-gutter pt-[26px] pb-9 ${done ? "" : "hidden"}`}>
        <button ref={cardBtnRef} type="button" className="btn-main" onClick={onCard} disabled={making}>
          {making ? "카드 만드는 중…" : "결과 카드 만들기"}
        </button>
        <button type="button" className="btn-sub" onClick={onAgain}>
          다른 사진 올리기
        </button>
      </div>
    </>
  );
}
