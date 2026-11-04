// Shared by the page (labels) and the server (prompt style)
export type MomKey = "kind" | "blunt" | "gyeongsang";

export type Mom = {
  name: string;
  sample: string; // example line on the picker
  tone: string; // result card background
  style: string; // goes into the prompt
};

export const MOMS: Record<MomKey, Mom> = {
  kind: {
    name: "다정한 엄마",
    sample: "밥은 먹고 다니지? 방도 좀 보자.",
    tone: "#f2c4ba",
    style: '부드럽게 돌려 말하지만 할 말은 다 하는 엄마. "~하자", "~했으면 좋겠다", "엄마는 그냥 걱정돼서 그래" 같은 말투.',
  },
  blunt: {
    name: "팩폭 엄마",
    sample: "이게 방이야, 창고야?",
    tone: "#ebc873",
    style: '짧고 세게 팩트로 때리는 엄마. "이게 방이니?", "너 이거 언제부터 여기 있었어" 같은 말투.',
  },
  gyeongsang: {
    name: "경상도 엄마",
    sample: "니 이래 살면 안 된데이.",
    tone: "#9cc9c0",
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

// score ranges -> stage name + color. The meter dividers sit at these cut points too.
export const STAGE_CUTS = [30, 60, 85];
export const STAGES = [
  { name: "쓰담쓰담", color: "#2f7d4f" },
  { name: "깊은 한숨", color: "#8a5d0b" },
  { name: "등짝 예약", color: "#c8541a" },
  { name: "등짝 스매싱", color: "#d7261e" },
];

export function stageIndex(n: number) {
  const i = STAGE_CUTS.findIndex((cut) => n <= cut);
  return i === -1 ? STAGES.length - 1 : i;
}

export function smashLabel(n: number) {
  return STAGES[stageIndex(n)].name;
}
