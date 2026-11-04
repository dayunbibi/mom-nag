import { MOMS, STAGES, STAGE_CUTS, stageIndex, type MomKey, type Nag } from "./moms";

// 9:16 story card, same layout as design_handoff_mom_nag_1a/ShareCard.dc.html
const W = 1080;
const H = 1920;
const PAD_X = 80;
const PAD_TOP = 84;
const PAD_BOTTOM = 72;

const MEOK = "#1f1a14";
const HANJI = "#fbf5e6";
const PAPER = "#fffdf7";
const DAEYA = "#d7261e";
const TOWEL = "#2f7d4f";
const TOWEL_INK = "#1f5a37";

const DISPLAY = '"Gasoek One", sans-serif';
const SANS = '"IBM Plex Sans KR", sans-serif';
const MONO = '"IBM Plex Mono", monospace';

// Google Fonts only downloads the Korean chunks the page shows.
// Text that only exists on the canvas needs to be loaded on purpose first.
async function loadFontsFor(text: string) {
  try {
    await Promise.all(
      [`40px ${DISPLAY}`, `500 40px ${SANS}`, `700 40px ${SANS}`, `500 30px ${MONO}`].map((f) => document.fonts.load(f, text)),
    );
  } catch {
    // fallback font is fine
  }
}

// wrap at spaces like the page does; a word that's too long on its own gets split by characters
function wrap(c: CanvasRenderingContext2D, text: string, maxW: number) {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (c.measureText(next).width <= maxW) {
      line = next;
      continue;
    }
    if (line) out.push(line);
    line = "";
    for (const ch of word) {
      if (c.measureText(line + ch).width > maxW && line) {
        out.push(line);
        line = ch;
      } else {
        line += ch;
      }
    }
  }
  if (line) out.push(line);
  return out;
}

function loadImage(src: string) {
  const img = new Image();
  img.src = src;
  return img.decode().then(() => img);
}

// box with a hard offset shadow and a thick border, like every box in the design
function hardBox(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill: string; border: number; shadow?: number; radius?: number | number[] },
) {
  const r = opts.radius ?? 0;
  if (opts.shadow) {
    c.fillStyle = MEOK;
    c.beginPath();
    c.roundRect(x + opts.shadow, y + opts.shadow, w, h, r);
    c.fill();
  }
  c.fillStyle = MEOK;
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
  const b = opts.border;
  const inner = Array.isArray(r) ? r.map((v) => Math.max(0, v - b)) : Math.max(0, r - b);
  c.fillStyle = opts.fill;
  c.beginPath();
  c.roundRect(x + b, y + b, w - b * 2, h - b * 2, inner);
  c.fill();
}

type Bubble = { lines: string[]; w: number; h: number };

export async function makeResultImage(nag: Nag, mom: MomKey, photoUrl: string): Promise<Blob> {
  const m = MOMS[mom];
  const stage = STAGES[stageIndex(nag.smash)];
  const isTop = stageIndex(nag.smash) === STAGES.length - 1;
  const footUrl = location.host + (nag.mock ? " · 연습 모드" : "");
  await loadFontsFor(
    ["AI 엄마 잔소리", m.name, "방 별명", nag.title, ...nag.nags, nag.praise, "그래도…", "등짝 스매싱 지수", stage.name, "우리 엄마는 몇 점 줄까?", "손바닥 자국", footUrl, "/1000123456789"].join(""),
  );
  const photo = await loadImage(photoUrl);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext("2d")!;
  c.textBaseline = "alphabetic";

  // mom's color + 90px grid
  c.fillStyle = m.tone;
  c.fillRect(0, 0, W, H);
  c.fillStyle = "rgba(31,26,20,.08)";
  for (let x = 0; x < W; x += 90) c.fillRect(x, 0, 2, H);
  for (let y = 0; y < H; y += 90) c.fillRect(0, y, W, 2);

  // header: logo left, mom tag right
  const headH = 74;
  const headMid = PAD_TOP + headH / 2;
  c.textBaseline = "middle";
  c.font = `52px ${DISPLAY}`;
  c.fillStyle = MEOK;
  c.fillText("AI 엄마 ", PAD_X, headMid);
  const logoW = c.measureText("AI 엄마 ").width;
  c.fillStyle = DAEYA;
  c.fillText("잔소리", PAD_X + logoW, headMid);

  c.font = `700 32px ${SANS}`;
  const tagW = c.measureText(m.name).width + 44 + 10;
  hardBox(c, W - PAD_X - tagW, PAD_TOP, tagW, headH, { fill: HANJI, border: 5 });
  c.fillStyle = MEOK;
  c.fillText(m.name, W - PAD_X - tagW + 27, headMid + 2);
  c.textBaseline = "alphabetic";

  // photo, cover-cropped, tilted
  const photoTop = PAD_TOP + headH + 56;
  const pw = 632;
  const ph = 372;
  c.save();
  c.translate(PAD_X + pw / 2, photoTop + ph / 2);
  c.rotate((-1.2 * Math.PI) / 180);
  hardBox(c, -pw / 2, -ph / 2, pw, ph, { fill: "#e2d7bd", border: 6, shadow: 16 });
  const iw = pw - 12;
  const ih = ph - 12;
  const scale = Math.max(iw / photo.width, ih / photo.height);
  const sw = iw / scale;
  const sh = ih / scale;
  c.drawImage(photo, (photo.width - sw) / 2, (photo.height - sh) / 2, sw, sh, -iw / 2, -ih / 2, iw, ih);
  c.restore();

  // 손바닥 자국 spot for the top stage (placeholder until there's an illustration)
  if (isTop) {
    c.save();
    c.translate(W - PAD_X - 20 - 150, photoTop - 10 + 180);
    c.rotate((-14 * Math.PI) / 180);
    c.beginPath();
    c.roundRect(-150, -180, 300, 360, [138, 138, 120, 120]);
    c.fillStyle = "rgba(215,38,30,.16)";
    c.fill();
    c.setLineDash([24, 16]);
    c.lineWidth = 8;
    c.strokeStyle = DAEYA;
    c.stroke();
    c.setLineDash([]);
    c.font = `500 26px ${MONO}`;
    const lw = c.measureText("손바닥 자국").width + 28;
    c.fillStyle = DAEYA;
    c.fillRect(-lw / 2, -22, lw, 44);
    c.fillStyle = "#fff";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("손바닥 자국", 0, 1);
    c.restore();
  }

  // room nickname sticker hanging off the photo's bottom-left
  {
    let size = 80;
    c.font = `${size}px ${DISPLAY}`;
    while (c.measureText(nag.title).width > 760 && size > 48) {
      size -= 4;
      c.font = `${size}px ${DISPLAY}`;
    }
    const nameW = c.measureText(nag.title).width;
    const sw2 = Math.max(nameW, 120) + 68 + 12;
    const sh2 = 6 + 16 + 42 + 4 + size * 1.05 + 22 + 6;
    const bottom = photoTop + ph + 78;
    c.save();
    c.translate(PAD_X + 44 + sw2 / 2, bottom - sh2 / 2);
    c.rotate((2 * Math.PI) / 180);
    hardBox(c, -sw2 / 2, -sh2 / 2, sw2, sh2, { fill: DAEYA, border: 6, shadow: 8 });
    c.fillStyle = "#fff";
    c.font = `700 28px ${SANS}`;
    c.letterSpacing = "1.7px";
    c.fillText("방 별명", -sw2 / 2 + 40, -sh2 / 2 + 6 + 16 + 31);
    c.letterSpacing = "0px";
    c.font = `${size}px ${DISPLAY}`;
    c.fillText(nag.title, -sw2 / 2 + 40, -sh2 / 2 + 6 + 16 + 42 + 4 + size * 0.86);
    c.restore();
  }

  // bottom block is pinned to the bottom, bubbles get whatever is left above it
  const bottomH = 6 + 30 + 189 + 28 + 50 + 30 + 48;
  const bottomTop = H - PAD_BOTTOM - bottomH;
  const bubblesTop = photoTop + ph + 118;
  const praiseLabelH = 30 * 1.5 + 8;

  // shrink the bubble text until everything fits (long answers happen)
  let font = 44;
  let nags: Bubble[] = [];
  let praise: Bubble = { lines: [], w: 0, h: 0 };
  for (; font >= 30; font -= 2) {
    const lh = Math.round(font * 1.38);
    c.font = `500 ${font}px ${SANS}`;
    const make = (text: string): Bubble => {
      const ls = wrap(c, text, 880 - 80 - 10);
      const w = Math.max(...ls.map((l) => c.measureText(l).width)) + 80 + 10;
      return { lines: ls, w, h: ls.length * lh + 52 + 10 };
    };
    nags = nag.nags.map(make);
    praise = make(nag.praise);
    const total = nags.reduce((s, b) => s + b.h + 26, 0) + praiseLabelH + praise.h;
    if (bubblesTop + total <= bottomTop - 30) break;
  }
  const lh = Math.round(font * 1.38);

  const drawBubble = (b: Bubble, x: number, y: number, fill: string, color: string, radius: number[]) => {
    hardBox(c, x, y, b.w, b.h, { fill, border: 5, radius });
    c.fillStyle = color;
    c.font = `500 ${font}px ${SANS}`;
    b.lines.forEach((l, i) => c.fillText(l, x + 45, y + 5 + 26 + lh * i + lh * 0.5 + font * 0.36));
  };

  let y = bubblesTop;
  for (const b of nags) {
    drawBubble(b, PAD_X, y, PAPER, MEOK, [40, 40, 40, 10]);
    y += b.h + 26;
  }
  c.textAlign = "right";
  c.font = `700 30px ${SANS}`;
  c.fillStyle = TOWEL_INK;
  c.fillText("그래도…", W - PAD_X, y + 34);
  c.textAlign = "left";
  y += praiseLabelH;
  drawBubble(praise, W - PAD_X - praise.w, y, TOWEL, "#fff", [40, 40, 10, 40]);

  // bottom: label + stamp on the left, big score on the right, meter, footer line
  c.fillStyle = MEOK;
  c.fillRect(PAD_X, bottomTop, W - PAD_X * 2, 6);
  const rowTop = bottomTop + 36;
  const rowBottom = rowTop + 189;

  c.font = `700 40px ${SANS}`;
  c.fillText("등짝 스매싱 지수", PAD_X, rowBottom - 100 - 18 - 14);

  c.font = `58px ${DISPLAY}`;
  const stampW = c.measureText(stage.name).width + 52 + 10;
  const stampH = 100;
  c.save();
  c.translate(PAD_X + stampW / 2, rowBottom - stampH / 2);
  c.rotate((-2 * Math.PI) / 180);
  hardBox(c, -stampW / 2, -stampH / 2, stampW, stampH, { fill: stage.color, border: 5, shadow: 8 });
  c.fillStyle = "#fff";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(stage.name, 0, -2);
  c.restore();

  c.textAlign = "right";
  c.fillStyle = MEOK;
  c.font = `46px ${DISPLAY}`;
  const slashW = c.measureText("/100").width;
  c.fillText("/100", W - PAD_X, rowBottom - 12);
  c.font = `230px ${DISPLAY}`;
  c.letterSpacing = "-4.6px";
  c.fillText(String(nag.smash), W - PAD_X - slashW, rowBottom - 12);
  c.letterSpacing = "0px";
  c.textAlign = "left";

  const barTop = rowBottom + 28;
  const barW = W - PAD_X * 2;
  hardBox(c, PAD_X, barTop, barW, 50, { fill: PAPER, border: 5 });
  c.fillStyle = stage.color;
  c.fillRect(PAD_X + 5, barTop + 5, ((barW - 10) * nag.smash) / 100, 40);
  c.fillStyle = "rgba(31,26,20,.35)";
  for (const cut of STAGE_CUTS) c.fillRect(PAD_X + 5 + ((barW - 10) * cut) / 100, barTop + 5, 4, 40);

  const footY = barTop + 50 + 30 + 36;
  c.fillStyle = MEOK;
  c.font = `500 30px ${MONO}`;
  c.fillText(footUrl, PAD_X, footY);
  c.textAlign = "right";
  c.font = `700 32px ${SANS}`;
  c.fillText("우리 엄마는 몇 점 줄까?", W - PAD_X, footY);

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
}
