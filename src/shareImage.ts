import { drinks, type Layer } from "./drinks";
import { mixColor, totalVolume, CAPACITY } from "./engine";
import { ingredients } from "./hiddenRecipes";
export type ShareTemplate = "pop" | "simple";
export type ShareDrink = { name: string; layers: Layer[] };
export const SHARE_WIDTH = 1080,
  SHARE_HEIGHT = 1920;
const family =
  '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", "Yu Gothic", Meiryo, sans-serif';
export function wrapText(
  text: string,
  maxWidth: number,
  measure: (text: string) => number,
): string[] {
  const segments =
    typeof Intl.Segmenter === "function"
      ? Array.from(
          new Intl.Segmenter("ja", { granularity: "grapheme" }).segment(text),
          (s) => s.segment,
        )
      : Array.from(text);
  const lines: string[] = [];
  let line = "";
  for (const character of segments) {
    if (character === "\n") {
      lines.push(line);
      line = "";
      continue;
    }
    if (line && measure(line + character) > maxWidth) {
      lines.push(line);
      line = character;
    } else line += character;
  }
  if (line || !lines.length) lines.push(line);
  return lines;
}
export function shareName(name: string) {
  return name.replace(/\s+/gu, " ").trim() || "無名のドリンク";
}
export function shareFilename(name: string) {
  return `drink-lab-${
    shareName(name)
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
      .slice(0, 30) || "drink"
  }.png`;
}
export function supportsFileShare(
  file: File,
  api: Pick<Navigator, "share" | "canShare"> = navigator,
): boolean {
  try {
    return (
      typeof api.share === "function" &&
      typeof api.canShare === "function" &&
      api.canShare({ files: [file] })
    );
  } catch {
    return false;
  }
}
function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}
export function drawShareImage(
  ctx: CanvasRenderingContext2D,
  drink: ShareDrink,
  template: ShareTemplate,
) {
  const total = totalVolume(drink.layers),
    color = mixColor(drink.layers),
    pop = template === "pop";
  const text = (
    value: string,
    x: number,
    y: number,
    size: number,
    weight = 700,
    align: CanvasTextAlign = "left",
    fill = "#65524F",
  ) => {
    ctx.font = `${weight} ${size}px ${family}`;
    ctx.textAlign = align;
    ctx.fillStyle = fill;
    ctx.fillText(value, x, y);
  };
  ctx.fillStyle = pop ? "#FFF8EA" : "#FCFAF5";
  ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT);
  if (pop) {
    rounded(ctx, -70, 120, 205, 205, 75, "#FFD8CC");
    rounded(ctx, 950, 340, 200, 260, 80, "#FFDF8D");
    ctx.fillStyle = "#E5EFDC";
    ctx.beginPath();
    ctx.arc(1080, 1040, 190, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = i % 2 ? "#E6C37C" : "#EAB8A6";
      ctx.beginPath();
      ctx.arc(55 + (i % 2) * 965, 220 + i * 62, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  text(
    "KIMAGURE JIYUCHO  /  DRINK LAB",
    540,
    108,
    22,
    700,
    "center",
    "#94796A",
  );
  text("まぜまぜドリンクラボ", 540, 188, 57, 900, "center");
  text(
    pop ? "わたしだけの、とっておき。" : "MY OWN LITTLE RECIPE",
    540,
    240,
    25,
    500,
    "center",
    "#94796A",
  );
  const name = shareName(drink.name).slice(0, 80);
  let nameSize = 64,
    nameLines: string[] = [];
  for (; nameSize >= 42; nameSize -= 2) {
    ctx.font = `800 ${nameSize}px ${family}`;
    nameLines = wrapText(name, 880, (s) => ctx.measureText(s).width);
    if (nameLines.length <= 4) break;
  }
  nameLines.forEach((line, index) =>
    text(line, 540, 322 + index * (nameSize + 12), nameSize, 800, "center"),
  );
  // The same glass silhouette, clipping and capacity proportions as Glass.tsx.
  ctx.save();
  ctx.translate(180, 505);
  ctx.scale(2.4, 2.4);
  ctx.fillStyle = "#65524F15";
  ctx.beginPath();
  ctx.ellipse(150, 279, 88, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  const outline = new Path2D(
    "M68 65 Q150 80 232 65 L213 251 Q210 273 150 276 Q90 273 87 251 Z",
  );
  ctx.fillStyle = "#FFFFFF88";
  ctx.fill(outline);
  ctx.strokeStyle = "#A3C4BF";
  ctx.lineWidth = 3;
  ctx.stroke(outline);
  ctx.save();
  ctx.clip(
    new Path2D(
      "M71 66 Q150 77 229 66 L210 248 Q208 266 150 268 Q92 266 90 248 Z",
    ),
  );
  const top = 254 - (total / CAPACITY) * 182;
  ctx.fillStyle = color;
  ctx.fillRect(70, top, 162, (total / CAPACITY) * 182 + 14);
  ctx.beginPath();
  ctx.ellipse(150, top, 80, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  const shine = ctx.createLinearGradient(70, 0, 232, 0);
  shine.addColorStop(0, "#FFFFFF80");
  shine.addColorStop(0.5, "#FFFFFF00");
  shine.addColorStop(1, "#FFFFFF40");
  ctx.fillStyle = shine;
  ctx.fillRect(70, 65, 162, 210);
  ctx.strokeStyle = "#FFFFFFAA";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.stroke(new Path2D("M88 84 L103 240 Q104 247 113 248"));
  ctx.fillStyle = "#FFFFFF80";
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(107 + i * 21, 245 - (i % 3) * 15, 2 + (i % 2), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = "#A3C4BF";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(150, 65, 82, 10, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  if (pop) {
    text("✦", 205, 790, 62, 700, "center", "#D7AE59");
    text("✧", 887, 1090, 70, 700, "center", "#D7AE59");
    text("✦", 872, 650, 42, 700, "center", "#E0B37C");
  }
  rounded(ctx, 290, 1215, 500, 70, 35, pop ? "#FFE7B5" : "#EEEAE2");
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(337, 1250, 15, 0, Math.PI * 2);
  ctx.fill();
  text(
    `${color}  /  ${Number(total.toFixed(1))} ml`,
    552,
    1262,
    29,
    700,
    "center",
  );
  rounded(ctx, 75, 1330, 930, 405, 35, pop ? "#FFF0DA" : "#F1EEE7");
  text("この一杯のレシピ", 116, 1395, 30, 800);
  const rows = ingredients(drink.layers);
  rows.forEach((layer, index) => {
    const col = index % 2,
      row = Math.floor(index / 2),
      x = 116 + col * 460,
      y = 1457 + row * 48;
    const drinkData = drinks.find((d) => d.id === layer.drinkId)!;
    ctx.fillStyle = drinkData.color;
    ctx.beginPath();
    ctx.arc(x + 9, y - 9, 8, 0, Math.PI * 2);
    ctx.fill();
    text(drinkData.name, x + 29, y, 29, 700);
    text(
      `${((layer.ml / total) * 100).toFixed(1)}%`,
      x + 387,
      y,
      30,
      700,
      "right",
    );
  });
  text("好きなものを、好きなだけ。", 540, 1808, 26, 500, "center", "#94796A");
  text("きまぐれ自由帳", 540, 1866, 32, 800, "center");
  // No public URL is assumed. A future deployment can explicitly provide one.
}
export async function generateShareImage(
  drink: ShareDrink,
  template: ShareTemplate,
): Promise<Blob> {
  if (
    !drink.layers.length ||
    totalVolume(drink.layers) <= 0 ||
    totalVolume(drink.layers) > CAPACITY + 1e-7
  )
    throw new Error("ドリンクの内容を確認してください。");
  if (document.fonts) {
    const fonts = Promise.all([
      document.fonts.ready,
      document.fonts.load(
        '800 64px "M PLUS Rounded 1c"',
        shareName(drink.name),
      ),
      document.fonts.load(
        '700 30px "M PLUS Rounded 1c"',
        drinks.map((d) => d.name).join(""),
      ),
    ]).catch(() => undefined);
    await Promise.race([
      fonts,
      new Promise((resolve) => setTimeout(resolve, 2200)),
    ]);
  }
  const canvas = document.createElement("canvas");
  canvas.width = SHARE_WIDTH;
  canvas.height = SHARE_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("このブラウザでは画像を作成できません。");
  drawShareImage(context, drink, template);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(
              new Error("画像の生成に失敗しました。もう一度お試しください。"),
            ),
      "image/png",
    ),
  );
}
