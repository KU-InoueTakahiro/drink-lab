import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { drinks } from "../src/drinks";
import { mixColor } from "../src/engine";
const layers = drinks.map((d) => ({ drinkId: d.id, ml: 30 }));
const longName =
  "ふわふわきらきら、まぜまぜドリンクラボで見つけた、とっておきの虹いろレシピ。"
    .repeat(3)
    .slice(0, 80);
const legacy = {
  format: "drink-lab",
  version: 1,
  recipes: [
    {
      id: "10000000-0000-4000-8000-000000000001",
      name: longName,
      layers,
      ingredients: layers,
      total: 300,
      color: mixColor(layers),
      createdAt: "2026-11-19T00:00:00.000Z",
    },
  ],
  discoveries: [],
  settings: { reducedMotion: true },
};
async function importLegacy(page: Page) {
  await page.goto("./");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "設定", exact: false })
    .click();
  await page.getByLabel("JSONファイル", { exact: true }).setInputFiles({
    name: "phase2.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(legacy)),
  });
  await page
    .getByRole("checkbox", {
      name: "入れ替え前に現在のJSONをバックアップ",
      exact: true,
    })
    .uncheck();
  await page
    .getByRole("button", { name: "インポートを確定", exact: true })
    .click();
  await expect(
    page.getByText("データをインポートしました。", { exact: false }),
  ).toBeVisible();
}
async function openShare(page: Page) {
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "自由レシピ", exact: false })
    .click();
  await page.locator(".recipe-card").click();
  await page
    .getByRole("button", { name: "このレシピを画像でシェア", exact: false })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
}
test("旧セーブの維持、2種類の1080×1920 PNGと80文字・10材料のプレビュー", async ({
  page,
}) => {
  await importLegacy(page);
  await page.reload();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "設定", exact: false })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "効果音をONにする", exact: false }),
  ).toBeChecked();
  await openShare(page);
  for (const template of ["ポップ", "シンプル"]) {
    await page.getByRole("button", { name: template, exact: false }).click();
    await expect(page.locator(".share-preview img")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "PNG画像を保存", exact: false }),
    ).toBeEnabled();
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "PNG画像を保存", exact: false })
      .click();
    const path = await (await download).path();
    expect(path).toBeTruthy();
    const png = await readFile(path!);
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(1080);
    expect(png.readUInt32BE(20)).toBe(1920);
  }
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    const bounds = await page.getByRole("dialog").boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.width).toBeLessThanOrEqual(width);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  }
  await page.getByRole("button", { name: "共有画面を閉じる" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("Web Shareが対応する環境でファイルを渡し、キャンセルをエラー扱いしない", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => true,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        if (!data.files?.length) throw new Error("Missing PNG");
        throw new DOMException("Cancelled", "AbortError");
      },
    });
  });
  await importLegacy(page);
  await openShare(page);
  await page
    .getByRole("button", { name: "端末の共有メニューを開く", exact: false })
    .click();
  await expect(
    page.getByText("共有をキャンセルしました。画像の保存もできます。"),
  ).toBeVisible();
});
test("音声とCanvasが利用できなくてもゲームを停止せず再試行を案内する", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: class {
        constructor() {
          throw new Error("Unsupported audio");
        }
      },
    });
    HTMLCanvasElement.prototype.getContext = (() =>
      null) as typeof HTMLCanvasElement.prototype.getContext;
  });
  await importLegacy(page);
  await expect(
    page.getByText(
      "この環境では効果音を再生できません。音なしでそのまま遊べます。",
    ),
  ).toBeVisible();
  await openShare(page);
  await expect(page.getByRole("alert")).toContainText("画像を作成できません");
  await expect(
    page.getByRole("button", { name: "画像生成を再試行" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "共有画面を閉じる" }).click();
  await expect(page.locator(".detail-panel")).toBeVisible();
});
