import NagApp from "@/components/NagApp";
import { currentProvider } from "@/lib/server/ai";
import { dbEnabled } from "@/lib/server/db";

// Say exactly where the photo goes, depending on which AI is connected.
// (Env vars are read at build time, and changing them on Vercel needs a redeploy anyway.)
const PRIVACY = {
  gemini:
    "이 사이트는 사진을 저장하지 않아요. 다만 잔소리를 만들려고 Google Gemini 무료 버전으로 보내고, 무료 버전은 Google이 서비스 개선에 쓸 수 있어요. 얼굴이나 주소가 보이는 사진은 피해주세요.",
  claude: "이 사이트는 사진을 저장하지 않아요. 잔소리를 만들 때만 AI(Claude)로 보내요.",
  mock: "지금은 연습 모드라 사진을 AI에 보내지 않아요. 이 사이트는 사진을 저장하지 않아요.",
};

const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || "mom-nag.vercel.app";

export default function Home() {
  const provider = currentProvider();

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col border-x-2 border-meok bg-hanji">
      <NagApp privacy={PRIVACY[provider]} practice={provider === "mock"} />

      <footer className="on-dark mt-auto bg-meok px-gutter pt-7 pb-[34px] text-caption leading-[1.6] text-[#e9e1cf]">
        {dbEnabled() && (
          <>
            <p className="m-0 font-bold text-jangpan">데이터 보관 안내</p>
            <p className="m-0 mt-1.5 text-pretty">
              도배를 막으려고 IP를 알아볼 수 없는 값으로 바꿔서 30일 동안만 보관해요. 저장하는 건 엄마 타입과 지수뿐이에요.
            </p>
          </>
        )}
        <div className={`flex flex-col gap-2 ${dbEnabled() ? "mt-[22px] border-t border-meok-line pt-4" : ""}`}>
          <span className="text-xs text-meok-muted">겨울 간식 게임도 있어요</span>
          <a
            href="https://homesick-games.vercel.app"
            className="self-start py-1 font-bold text-hanji underline underline-offset-[3px] hover:text-jangpan"
          >
            향수병 게임즈 ↗
          </a>
        </div>
        <p className="m-0 mt-5 font-mono text-[11px] text-meok-muted">{host}</p>
      </footer>
    </main>
  );
}
