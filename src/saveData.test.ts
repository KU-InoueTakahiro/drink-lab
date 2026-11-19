import { describe, expect, it, vi } from "vitest";
import {
  createRecipe,
  newRecipeId,
  discover,
  emptySave,
  parseImport,
  validateSave,
  MAX_IMPORT_BYTES,
  type SaveData,
} from "./saveData";
import { hiddenRecipes, targetLayers } from "./hiddenRecipes";
type InvalidSave = Omit<SaveData, "version" | "format" | "settings"> & {
  version: number;
  format: string;
  settings: { reducedMotion: unknown };
};
const sample = () => {
  const data = emptySave();
  data.recipes.push(createRecipe(targetLayers(hiddenRecipes[0]), "こもれび"));
  return data;
};
describe("保存データとインポート検証", () => {
  it("UUIDと注入順・集計・色を保存し、空名を補う", () => {
    const recipe = createRecipe(
      [
        { drinkId: "cola", ml: 50 },
        { drinkId: "melon", ml: 100 },
        { drinkId: "cola", ml: 50 },
      ],
      "   ",
    );
    expect(recipe.name).toBe("無名のドリンク");
    expect(recipe.ingredients).toEqual([
      { drinkId: "cola", ml: 100 },
      { drinkId: "melon", ml: 100 },
    ]);
    expect(recipe.layers).toHaveLength(3);
    expect(recipe.total).toBe(200);
    expect(recipe.hiddenRecipeId).toBe("forest-cola");
    expect(
      validateSave({ ...emptySave(), recipes: [recipe] }).recipes[0],
    ).toEqual(recipe);
  });
  it("ローカルHTTPでもUUID v4を作れる", () => {
    const getRandomValues = crypto.getRandomValues.bind(crypto);
    vi.stubGlobal("crypto", { getRandomValues });
    try {
      expect(newRecipeId()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("同じ配合を別UUIDで複数保存できる", () => {
    const a = createRecipe(targetLayers(hiddenRecipes[0]), "A"),
      b = createRecipe(targetLayers(hiddenRecipes[0]), "B");
    expect(a.id).not.toBe(b.id);
    expect(
      validateSave({ ...emptySave(), recipes: [a, b] }).recipes,
    ).toHaveLength(2);
  });
  it("書き出し→読み込みが往復する", () => {
    const data = sample();
    expect(parseImport(JSON.stringify(data))).toEqual(data);
  });
  it("図鑑登録前でも発見し、初回だけNEWになる", () => {
    const first = discover(
      emptySave(),
      targetLayers(hiddenRecipes[0]),
      "2026-11-19T00:00:00.000Z",
    );
    expect(first.isNew).toBe(true);
    expect(first.data.recipes).toEqual([]);
    expect(first.data.discoveries).toHaveLength(1);
    const second = discover(first.data, targetLayers(hiddenRecipes[0]));
    expect(second.isNew).toBe(false);
    expect(second.data.discoveries).toEqual(first.data.discoveries);
  });
  for (const [name, mutate] of Object.entries({
    未知バージョン: (v: InvalidSave): unknown => (v.version = 2),
    別ゲーム: (v: InvalidSave): unknown => (v.format = "other"),
    負の材料: (v: InvalidSave): unknown => (v.recipes[0].layers[0].ml = -1),
    未知材料: (v: InvalidSave): unknown =>
      Object.assign(v.recipes[0].layers[0], { drinkId: "milk" }),
    容量超過: (v: InvalidSave): unknown => (v.recipes[0].layers[0].ml = 301),
    合計改ざん: (v: InvalidSave): unknown => (v.recipes[0].total = NaN),
    色改ざん: (v: InvalidSave): unknown => (v.recipes[0].color = "#000000"),
    配合集計の不一致: (v: InvalidSave): unknown =>
      (v.recipes[0].ingredients[0].ml += 1),
    UUID重複: (v: InvalidSave): unknown => v.recipes.push(v.recipes[0]),
    不正UUID: (v: InvalidSave): unknown => (v.recipes[0].id = "oops"),
    不正日時: (v: InvalidSave): unknown =>
      (v.recipes[0].createdAt = "yesterday"),
    長すぎる名前: (v: InvalidSave): unknown =>
      (v.recipes[0].name = "あ".repeat(81)),
    空名: (v: InvalidSave): unknown => (v.recipes[0].name = " "),
    不正な隠しID: (v: InvalidSave): unknown =>
      (v.recipes[0].hiddenRecipeId = "pure-water"),
    発見重複: (v: InvalidSave): unknown =>
      (v.discoveries = [
        { id: "forest-cola", discoveredAt: "2026-11-19T00:00:00.000Z" },
        { id: "forest-cola", discoveredAt: "2026-11-19T00:00:00.000Z" },
      ]),
    不正な設定: (v: InvalidSave): unknown =>
      (v.settings.reducedMotion = "true"),
  }))
    it(`${name}を拒否`, () => {
      const data = sample();
      mutate(data);
      expect(() => validateSave(data)).toThrow();
    });
  it("不正JSONと過大ファイルを拒否", () => {
    expect(() => parseImport("{")).toThrow();
    expect(() => parseImport(" ".repeat(MAX_IMPORT_BYTES + 1))).toThrow("5MB");
  });
});
