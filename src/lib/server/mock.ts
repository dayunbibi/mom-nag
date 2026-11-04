import type { MomKey, Nag } from "../moms";

// Used when ANTHROPIC_API_KEY isn't set, so the app still works (and is easy to develop on).
// It doesn't look at the photo, which is why the page labels it as practice mode.
const MOCKS: Record<MomKey, Omit<Nag, "mock">[]> = {
  kind: [
    {
      smash: 48,
      title: "조금만 치우면 되는 방",
      nags: ["책상 위에 컵이 몇 개니… 하나씩만 갖다 놓자", "옷은 의자 말고 옷장에 걸어주면 좋겠다", "엄마는 그냥 네가 먼지 먹을까 봐 그래"],
      praise: "이불은 개놨네. 잘했어",
    },
  ],
  blunt: [
    {
      smash: 82,
      title: "사람 사는 방 맞니",
      nags: ["이게 방이니 창고니", "그 컵 언제부터 거기 있었어", "바닥에 옷 깔아놓고 카펫이라고 할 거야?"],
      praise: "창문 열어둔 건 잘했다",
    },
  ],
  gyeongsang: [
    {
      smash: 76,
      title: "와 이래 해놨노 방",
      nags: ["니 이거 뭐꼬, 방이가 쓰레기통이가", "컵 좀 갖다 놔라 카이, 몇 번 말하노", "옷은 와 바닥에서 자고 있노"],
      praise: "책은 반듯하게 꽂아놨네",
    },
  ],
};

export function mockNag(mom: MomKey): Nag {
  const list = MOCKS[mom];
  return { ...list[Math.floor(Math.random() * list.length)], mock: true };
}
