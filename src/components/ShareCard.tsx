"use client";

import { useEffect, useRef, useState } from "react";

type Props = { url: string; blob: Blob; smash: number; onClose: () => void };

// full-screen preview of the 1080x1920 card, with save + share
export default function ShareCard({ url, blob, smash, onClose }: Props) {
  const [toast, setToast] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // the parent passes a new function every render; keep the effect below from re-running
  const closeFn = useRef(onClose);
  closeFn.current = onClose;

  useEffect(() => {
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // no page scrolling behind the modal

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeFn.current();
      // keep Tab inside the dialog
      if (e.key === "Tab" && dialogRef.current) {
        const items = dialogRef.current.querySelectorAll<HTMLElement>("button");
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      clearTimeout(toastTimer.current);
    };
  }, []);

  function flash(msg: string) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1800);
  }

  function save() {
    const a = document.createElement("a");
    a.href = url;
    a.download = "mom-nag.png";
    a.click();
    flash("이미지를 저장했어요");
  }

  async function share() {
    const text = `우리 엄마 등짝 스매싱 지수 ${smash}… 너도 방 사진 올려봐`;
    const file = new File([blob], "mom-nag.png", { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return;
      }
      if (navigator.share) {
        await navigator.share({ text, url: location.href });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${location.href}`);
      flash("링크를 복사했어요");
    } catch (err) {
      // user closed the share sheet -> not an error
      if ((err as Error).name !== "AbortError") flash("공유하지 못했어요. 이미지를 저장해서 올려주세요");
    }
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-title"
      className="on-dark fixed inset-0 z-50 overflow-y-auto bg-meok/92"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mx-auto flex max-w-[430px] flex-col items-center gap-3.5 px-gutter pt-4 pb-6">
        <div className="flex w-full items-center justify-between text-hanji">
          <span id="card-title" className="text-[15px] font-bold">
            결과 카드
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-ui border-2 border-hanji px-3.5 text-sm font-bold text-hanji"
          >
            닫기
          </button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- blob URL */}
        <img
          src={url}
          alt={`등짝 스매싱 지수 ${smash}점 결과 카드`}
          className="aspect-[9/16] w-[302px] max-w-full animate-pop outline-2 outline-hanji"
        />
        <span className="text-xs text-meok-muted">1080 × 1920 · 스토리에 바로 올리기 좋은 크기</span>
        <div className="grid w-full grid-cols-2 gap-2.5">
          <button type="button" onClick={save} className="h-[54px] rounded-ui border-2 border-jangpan bg-jangpan font-display text-lg text-meok">
            이미지 저장
          </button>
          <button type="button" onClick={share} className="h-[54px] rounded-ui border-2 border-hanji font-display text-lg text-hanji">
            공유하기
          </button>
        </div>
      </div>
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-7 flex justify-center">
        {toast && (
          <span className="animate-pop border-2 border-meok bg-hanji px-4 py-2.5 text-sm font-bold whitespace-nowrap text-meok shadow-hard-sm">{toast}</span>
        )}
      </div>
    </div>
  );
}
