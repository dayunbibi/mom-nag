import NagApp from "@/components/NagApp";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-[460px] flex-col gap-7 px-4 pt-8 pb-12">
      <header className="flex flex-col gap-2">
        <p className="m-0 font-ui text-sm text-ink-dim">토론토에서 엄마 잔소리마저 그리워서 만든</p>
        <h1 className="m-0 font-sign text-[44px] leading-none font-normal text-balance">
          AI 엄마 <span className="text-red">잔소리</span>
        </h1>
        <p className="m-0 leading-relaxed">방 사진 한 장 올리면 엄마가 보이는 것마다 한마디 해요.</p>
        <p className="m-0 text-sm text-ink-dim">📷 사진은 어디에도 저장하지 않아요. 엄마만 보고 잊어요.</p>
      </header>

      <NagApp />

      <footer className="border-t-2 border-line pt-4 text-center text-sm text-ink-dim">
        겨울 간식 게임도 있어요{" "}
        <a href="https://homesick-games.vercel.app" className="font-ui text-ink underline decoration-red decoration-2 underline-offset-4">
          향수병 게임즈
        </a>
      </footer>
    </main>
  );
}
