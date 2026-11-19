import { describe, expect, it } from "vitest";
import {
  hiddenRecipes,
  matchHiddenRecipe,
  targetLayers,
  type HiddenRecipe,
} from "./hiddenRecipes";
import type { Layer } from "./drinks";
describe("隠しレシピ", () => {
  it("15種類のIDが一意", () => {
    expect(hiddenRecipes).toHaveLength(15);
    expect(new Set(hiddenRecipes.map((r) => r.id)).size).toBe(15);
  });
  for (const recipe of hiddenRecipes)
    it(`${recipe.name}は実際に達成できる`, () => {
      const layers = targetLayers(recipe);
      expect(layers.reduce((sum, l) => sum + l.ml, 0)).toBeLessThanOrEqual(300);
      expect(Object.values(recipe.ratios).reduce((sum, r) => sum + r!, 0)).toBe(
        100,
      );
      expect(matchHiddenRecipe(layers)?.id).toBe(recipe.id);
      expect(matchHiddenRecipe([...layers].reverse())?.id).toBe(recipe.id);
      expect(
        matchHiddenRecipe(
          layers.flatMap((l) => [
            { ...l, ml: l.ml / 2 },
            { ...l, ml: l.ml / 2 },
          ]),
        )?.id,
      ).toBe(recipe.id);
    });
  it("5パーセントポイントの境界は含むが超えると不成立", () => {
    const layers: Layer[] = [
      { drinkId: "melon", ml: 55 },
      { drinkId: "calpis", ml: 45 },
    ];
    expect(matchHiddenRecipe(layers)?.id).toBe("cloud-melon");
    expect(
      matchHiddenRecipe([
        { drinkId: "melon", ml: 54.99 },
        { drinkId: "calpis", ml: 45.01 },
      ]),
    ).toBeUndefined();
    expect(
      matchHiddenRecipe([
        { drinkId: "melon", ml: 65 },
        { drinkId: "calpis", ml: 35 },
      ])?.id,
    ).toBe("cloud-melon");
  });
  it("指定外の材料はごく少量でも不成立", () => {
    expect(
      matchHiddenRecipe([
        ...targetLayers(hiddenRecipes[0]),
        { drinkId: "water", ml: 0.001 },
      ]),
    ).toBeUndefined();
  });
  it("必要材料の欠落・最低量未満・空は不成立", () => {
    expect(matchHiddenRecipe([{ drinkId: "cola", ml: 100 }])).toBeUndefined();
    expect(
      matchHiddenRecipe([
        { drinkId: "cola", ml: 49.9 },
        { drinkId: "melon", ml: 49.9 },
      ]),
    ).toBeUndefined();
    expect(matchHiddenRecipe([])).toBeUndefined();
  });
  it("水は300mlちょうどが必要", () => {
    expect(
      matchHiddenRecipe([{ drinkId: "water", ml: 299.99 }]),
    ).toBeUndefined();
    expect(matchHiddenRecipe([{ drinkId: "water", ml: 300 }])?.id).toBe(
      "pure-water",
    );
  });
  it("優先度が高い条件を採用し、配列を変更しない", () => {
    const candidates: HiddenRecipe[] = [
      { ...hiddenRecipes[0], id: "low", priority: 1 },
      { ...hiddenRecipes[0], id: "high", priority: 100 },
    ];
    expect(matchHiddenRecipe(targetLayers(candidates[0]), candidates)?.id).toBe(
      "high",
    );
    expect(candidates[0].id).toBe("low");
  });
});
