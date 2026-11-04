"use client";

import { useState } from "react";

type Props = { url: string; blob: Blob; smash: number };

export default function ShareCard({ url, blob, smash }: Props) {
  const [toast, setToast] = useState("");

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }

  function save() {
    const a = document.createElement("a");
    a.href = url;
    a.download = "mom-nag.png";
    a.click();
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
    <div className="flex flex-col items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- blob URL */}
      <img src={url} alt={`등짝 스매싱 지수 ${smash} 결과 카드`} className="w-full max-w-[280px] rounded-xl shadow-lg" />
      <div className="flex w-full gap-2.5">
        <button className="btn btn-ghost flex-1" onClick={save}>
          이미지 저장
        </button>
        <button className="btn flex-1" onClick={share}>
          공유하기
        </button>
      </div>
      <p role="status" className="m-0 min-h-5 text-sm text-red">
        {toast}
      </p>
    </div>
  );
}
