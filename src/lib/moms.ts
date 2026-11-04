// Shared by the page (labels) and the server (prompt style)
export type MomKey = "kind" | "blunt" | "gyeongsang";

export type Mom = {
  name: string;
  emoji: string;
  desc: string; // shown on the picker
  style: string; // goes into the prompt
};

export const MOMS: Record<MomKey, Mom> = {
  kind: {
    name: "다정한 엄마",
    emoji: "🙂",
    desc: "돌려 말하지만 다 들림",
    style: '부드럽게 돌려 말하지만 할 말은 다 하는 엄마. "~하자", "~했으면 좋겠다", "엄마는 그냥 걱정돼서 그래" 같은 말투.',
  },
  blunt: {
    name: "팩폭 엄마",
    emoji: "😤",
    desc: "한 줄 한 줄이 등짝",
    style: '짧고 세게 팩트로 때리는 엄마. "이게 방이니?", "너 이거 언제부터 여기 있었어" 같은 말투.',
  },
  gyeongsang: {
    name: "경상도 엄마",
    emoji: "🗣️",
    desc: "니 이거 뭐꼬",
    style: '경상도 사투리를 쓰는 엄마. "뭐꼬", "와 이래 해놨노", "~카이", "~나" 같은 말투.',
  },
};

export const MOM_KEYS = Object.keys(MOMS) as MomKey[];

export function isMomKey(v: unknown): v is MomKey {
  return typeof v === "string" && v in MOMS;
}

// what the API sends back
export type Nag = {
  smash: number; // 등짝 스매싱 지수 0~100
  title: string;
  nags: string[]; // exactly 3
  praise: string; // one nice thing, moms always find one
  mock: boolean; // true = example answer, no AI connected
};

export function smashLabel(n: number) {
  if (n <= 30) return "쓰담쓰담";
  if (n <= 60) return "깊은 한숨";
  if (n <= 85) return "등짝 예약";
  return "등짝 스매싱";
}
