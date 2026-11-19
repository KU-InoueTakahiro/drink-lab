import { test, expect, type Page } from "@playwright/test";
const volume = async (page: Page) =>
  Number((await page.getByTestId("volume").innerText()).split("/")[0].trim());
async function start(page: Page) {
  await page.goto("./");
  await page
    .getByRole("button", { name: "ドリンクをつくる", exact: false })
    .first()
    .click();
}
test("Phase 1 注入・停止・履歴・完成画面", async ({ page }) => {
  await start(page);
  await expect(page.getByRole("button", { name: "まぜまぜ！" })).toBeDisabled();
  const cola = page.getByRole("button", { name: "コーラを注ぐ" });
  await cola.focus();
  await page.keyboard.down("Space");
  await page.keyboard.up("Space");
  expect(await volume(page)).toBe(5);
  await cola.focus();
  await page.keyboard.down("Space");
  await page.waitForTimeout(1050);
  await page.keyboard.up("Space");
  const poured = await volume(page);
  expect(poured).toBeGreaterThan(60);
  expect(poured).toBeLessThan(90);
  await page.waitForTimeout(200);
  expect(await volume(page)).toBe(poured);
  await page.getByRole("button", { name: "水を注ぐ", exact: true }).click();
  await expect(page.locator(".liquid-layer")).toHaveCount(2);
  await page.getByRole("button", { name: "1操作戻す" }).click();
  expect(await volume(page)).toBe(poured);
  await page.getByRole("button", { name: "まぜまぜ！" }).click();
  await expect(
    page.getByRole("heading", { name: "ドリンク完成！" }),
  ).toBeVisible();
  await expect(page.getByText("100.0%")).toBeVisible();
  await expect(page.locator(".completion .blended")).toHaveClass(/visible/);
  await page.getByRole("button", { name: "もう一杯つくる" }).click();
  expect(await volume(page)).toBe(0);
});
test("混ぜる前はゲージが注入順の層になり、完成色を先に見せない", async ({
  page,
}) => {
  await start(page);
  for (const name of ["コーラ", "水", "コーラ"])
    await page
      .getByRole("button", { name: `${name}を注ぐ`, exact: true })
      .click();
  const gauge = page.getByRole("progressbar", { name: "グラスの容量" });
  await expect(gauge.locator(".volume-segment")).toHaveCount(3);
  expect(
    await gauge
      .locator(".volume-segment")
      .evaluateAll((elements) =>
        elements.map((el) => el.getAttribute("data-drink-id")),
      ),
  ).toEqual(["cola", "water", "cola"]);
  expect(
    await gauge
      .locator(".volume-segment")
      .evaluateAll((elements) =>
        elements.map((el) => getComputedStyle(el).backgroundColor),
      ),
  ).toEqual(["rgb(113, 61, 55)", "rgb(185, 226, 236)", "rgb(113, 61, 55)"]);
  await expect(gauge.locator(".volume-blend")).toHaveCount(0);
  await expect(page.locator(".glass .blended")).toHaveCount(0);
  await expect(gauge).toHaveAttribute("aria-valuenow", "15");
  await page.getByRole("button", { name: "1操作戻す", exact: false }).click();
  await expect(gauge.locator(".volume-segment")).toHaveCount(2);
  await expect(gauge).toHaveAttribute("aria-valuenow", "10");
  await page.getByRole("button", { name: "まぜまぜ！", exact: false }).click();
  await expect(page.locator(".volume-blend")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "ドリンク完成！" }),
  ).toBeVisible();
  await expect(page.locator(".completion .color-label")).toContainText(
    "#959092",
  );
});

test("図鑑から戻っても作成途中のグラスと履歴が残る", async ({ page }) => {
  await start(page);
  await page.getByRole("button", { name: "メロンソーダを注ぐ" }).click();
  expect(await volume(page)).toBe(5);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "自由レシピ", exact: false })
    .click();
  await page.getByRole("button", { name: "戻る", exact: false }).click();
  expect(await volume(page)).toBe(5);
  await page.getByRole("button", { name: "1操作戻す", exact: false }).click();
  expect(await volume(page)).toBe(0);
});

test("容量上限・外移動・非アクティブ停止", async ({ page }) => {
  await start(page);
  const button = page.getByRole("button", { name: "メロンソーダを注ぐ" });
  const box = (await button.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(200);
  await page.mouse.move(1, 1);
  const stopped = await volume(page);
  await page.waitForTimeout(150);
  expect(await volume(page)).toBe(stopped);
  await page.mouse.up();
  await button.focus();
  await page.keyboard.down("Space");
  await page.waitForTimeout(150);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  const blurred = await volume(page);
  await page.waitForTimeout(150);
  expect(await volume(page)).toBe(blurred);
  await page.keyboard.up("Space");
  await button.focus();
  await page.keyboard.down("Space");
  await page.waitForTimeout(5200);
  await page.keyboard.up("Space");
  expect(await volume(page)).toBe(300);
  await expect(button).toBeDisabled();
});
test("初回発見・未登録で永続化・重複登録・改名・削除・再現", async ({
  page,
}) => {
  await start(page);
  const water = page.getByRole("button", { name: "水を注ぐ", exact: true });
  await water.focus();
  await page.keyboard.down("Space");
  await page.waitForTimeout(5150);
  await page.keyboard.up("Space");
  await page.getByRole("button", { name: "まぜまぜ！" }).click();
  await expect(page.getByText("NEW! 新しいドリンクを発見！")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "図鑑に登録", exact: true }),
  ).toBeEnabled();
  await page.reload();
  await page
    .getByRole("button", { name: "発見図鑑", exact: false })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "とうめいの宝石" }),
  ).toBeVisible();
  await page.getByRole("heading", { name: "とうめいの宝石" }).click();
  await page.getByRole("button", { name: "この一杯をつくる" }).click();
  await expect(
    page.getByRole("heading", { name: "再現ガイド", exact: false }),
  ).toBeVisible();
  expect(await volume(page)).toBe(0);
  const again = page.getByRole("button", { name: "水を注ぐ", exact: true });
  await again.focus();
  await page.keyboard.down("Space");
  await page.waitForTimeout(5150);
  await page.keyboard.up("Space");
  await page.getByRole("button", { name: "まぜまぜ！" }).click();
  await expect(
    page.getByText("✧ 発見済みのドリンク", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("NEW! 新しいドリンクを発見！")).toHaveCount(0);
  await page.getByRole("button", { name: "図鑑に登録", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "登録しました" }),
  ).toBeVisible();
  await page.getByLabel("ドリンク名", { exact: true }).fill("水の宝石");
  await page.getByRole("button", { name: "図鑑に登録", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "水の宝石" }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "自由レシピ", exact: false })
    .first()
    .click();
  await expect(page.locator(".recipe-card")).toHaveCount(2);
  await page.getByLabel("名前で検索").fill("水の宝石");
  await expect(page.locator(".recipe-card")).toHaveCount(1);
  await page.locator(".recipe-card").click();
  await page.getByLabel("名前の変更").fill("きらきらの水");
  await page.getByRole("button", { name: "名前を保存" }).click();
  await expect(
    page.getByRole("heading", { name: "きらきらの水" }),
  ).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "削除", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "削除しました" }),
  ).toBeVisible();
});
for (const width of [320, 390, 768, 1440])
  test(`各画面に横スクロールなし ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    for (const name of ["自由レシピ", "発見図鑑", "設定"]) {
      await page
        .getByRole("navigation")
        .getByRole("button", { name, exact: false })
        .click();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "ホーム", exact: false })
      .click();
    await page
      .getByRole("button", { name: "ドリンクをつくる", exact: false })
      .first()
      .click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await expect(
      page.getByRole("button", { name: "コーラを注ぐ" }),
    ).toBeVisible();
  });
