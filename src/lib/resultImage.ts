import { MOMS, smashLabel, type MomKey, type Nag } from "./moms";

const W = 1080;
const H = 1920;

// Google Fonts only downloads the Korean chunks the page shows.
// Text that only exists on the canvas needs to be loaded on purpose first.
async function loadFontsFor(text: string) {
  try {
    await Promise.all(['"Black Han Sans"', "Jua", '"Gowun Dodum"'].map((f) => document.fonts.load(`40px ${f}`, text)));
  } catch {
    // fallback font is fine
  }
}

// split into lines that fit maxW (Korean lines can break between any characters)
function lines(c: CanvasRenderingContext2D, text: string, maxW: number) {
  const out: string[] = [];
  let line = "";
  for (const ch of text) {
    if (c.measureText(line + ch).width > maxW && line) {
      out.push(line);
      line = ch.trim() ? ch : "";
    } else {
      line += ch;
    }
  }
  if (line) out.push(line);
  return out;
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}

function loadImage(src: string) {
  const img = new Image();
  img.src = src;
  return img.decode().then(() => img);
}

export async function makeResultImage(nag: Nag, mom: MomKey, photoUrl: string): Promise<Blob> {
  const m = MOMS[mom];
  const smashLine = `등짝 스매싱 지수 ${nag.smash} · ${smashLabel(nag.smash)}`;
  await loadFontsFor(["AI 엄마 잔소리", m.name, nag.title, ...nag.nags, nag.praise, smashLine, "그래도", "향수병 게임즈"].join(""));
  const photo = await loadImage(photoUrl);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext("2d")!;

  // 장판 floor
  c.fillStyle = "#e7c483";
  c.fillRect(0, 0, W, H);
  c.strokeStyle = "rgba(160,110,40,0.18)";
  c.lineWidth = 3;
  for (let x = 0; x < W; x += 180) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, H);
    c.stroke();
  }
  for (let y = 0; y < H; y += 180) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(W, y);
    c.stroke();
  }

  c.fillStyle = "#d6402b";
  c.fillRect(0, 0, W, 130);
  c.textAlign = "center";
  c.fillStyle = "#fffaf0";
  c.font = '60px "Black Han Sans", sans-serif';
  c.fillText("AI 엄마 잔소리", W / 2, 90);

  // polaroid with the photo, cover-cropped
  const pw = 760;
  const ph = 520;
  c.save();
  c.translate(W / 2, 230 + ph / 2 + 30);
  c.rotate(-0.03);
  c.fillStyle = "rgba(60,40,10,0.25)";
  c.fillRect(-pw / 2 - 26, -ph / 2 - 26, pw + 64, ph + 120);
  c.fillStyle = "#fffaf0";
  c.fillRect(-pw / 2 - 30, -ph / 2 - 30, pw + 60, ph + 116);
  const scale = Math.max(pw / photo.width, ph / photo.height);
  const sw = pw / scale;
  const sh = ph / scale;
  c.drawImage(photo, (photo.width - sw) / 2, (photo.height - sh) / 2, sw, sh, -pw / 2, -ph / 2, pw, ph);
  c.fillStyle = "#3b2a1d";
  c.font = '44px "Black Han Sans", sans-serif';
  c.fillText(nag.title, 0, ph / 2 + 60);
  c.restore();

  // mom's chat bubbles
  let y = 950;
  c.textAlign = "left";
  c.font = "30px Jua, sans-serif";
  c.fillStyle = "#7a6450";
  c.fillText(`${m.emoji} ${m.name}`, 90, y);
  y += 24;
  c.font = '40px "Gowun Dodum", sans-serif';
  for (const text of nag.nags) {
    const ls = lines(c, text, 760);
    const bh = ls.length * 54 + 44;
    const bw = Math.min(860, Math.max(...ls.map((l) => c.measureText(l).width)) + 64);
    c.fillStyle = "#fffaf0";
    roundRect(c, 90, y, bw, bh, 30);
    c.fill();
    c.fillStyle = "#3b2a1d";
    ls.forEach((l, i) => c.fillText(l, 122, y + 62 + i * 54));
    y += bh + 22;
  }

  // praise, slightly different bubble
  c.font = '38px "Gowun Dodum", sans-serif';
  const praise = `그래도… ${nag.praise}`;
  const pl = lines(c, praise, 760);
  const pbh = pl.length * 52 + 40;
  const pbw = Math.min(860, Math.max(...pl.map((l) => c.measureText(l).width)) + 64);
  c.fillStyle = "#f6e3b0";
  roundRect(c, 90, y, pbw, pbh, 30);
  c.fill();
  c.fillStyle = "#7a6450";
  pl.forEach((l, i) => c.fillText(l, 122, y + 58 + i * 52));
  y += pbh;

  // score right under the bubbles, but never past the footer
  const scoreY = Math.min(y + 210, 1740);
  c.textAlign = "center";
  c.fillStyle = "#d6402b";
  c.font = '150px "Black Han Sans", sans-serif';
  c.fillText(String(nag.smash), W / 2, scoreY);
  c.fillStyle = "#3b2a1d";
  c.font = "40px Jua, sans-serif";
  c.fillText(smashLine, W / 2, scoreY + 62);

  c.fillStyle = "#7a6450";
  c.font = "32px Jua, sans-serif";
  c.fillText(nag.mock ? "향수병 게임즈 · 연습 모드" : "향수병 게임즈", W / 2, 1878);

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
}
