import NagApp from "@/components/NagApp";
import { currentProvider } from "@/lib/server/ai";
import { dbEnabled } from "@/lib/server/db";

// Say exactly where the photo goes, depending on which AI is connected.
// (Env vars are read at build time, and changing them on Vercel needs a redeploy anyway.)
const PRIVACY = {
  gemini:
    "📷 이 사이트는 사진을 저장하지 않아요. 다만 잔소리를 만들려고 Google Gemini 무료 버전으로 보내고, 무료 버전은 Google이 서비스 개선에 쓸 수 있어요. 얼굴이나 주소가 보이는 사진은 피해주세요.",
  claude: "📷 이 사이트는 사진을 저장하지 않아요. 잔소리를 만들 때만 AI(Claude)로 보내요.",
  mock: "📷 지금은 연습 모드라 사진을 AI에 보내지 않아요. 이 사이트는 사진을 저장하지 않아요.",
};

export default function Home() {
  const provider = currentProvider();

  return (
    <main className="mx-auto flex max-w-[460px] flex-col gap-7 px-4 pt-8 pb-12">
      <header className="flex flex-col gap-2">
        <p className="m-0 font-ui text-sm text-ink-dim">토론토에서 엄마 잔소리마저 그리워서 만든</p>
        <h1 className="m-0 font-sign text-[44px] leading-none font-normal text-balance">
          AI 엄마 <span className="text-red">잔소리</span>
        </h1>
        <p className="m-0 leading-relaxed">방 사진 한 장 올리면 엄마가 보이는 것마다 한마디 해요.</p>
        <p className="m-0 text-sm leading-relaxed text-ink-dim">{PRIVACY[provider]}</p>
      </header>

      <NagApp />

      <footer className="flex flex-col gap-2 border-t-2 border-line pt-4 text-center text-sm text-ink-dim">
        {dbEnabled() && (
          <p className="m-0 text-xs leading-relaxed">
            도배를 막으려고 IP를 알아볼 수 없는 값으로 바꿔서 30일 동안만 보관해요. 저장하는 건 엄마 타입과 지수뿐이에요.
          </p>
        )}
        <p className="m-0">
          겨울 간식 게임도 있어요{" "}
          <a href="https://homesick-games.vercel.app" className="font-ui text-ink underline decoration-red decoration-2 underline-offset-4">
            향수병 게임즈
          </a>
        </p>
      </footer>
    </main>
  );
}
