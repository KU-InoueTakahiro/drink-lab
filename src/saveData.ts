import { drinks, type Layer } from "./drinks";
import { CAPACITY, mixColor, totalVolume } from "./engine";
import { hiddenRecipes, ingredients, matchHiddenRecipe } from "./hiddenRecipes";
export type Recipe = {
  id: string;
  name: string;
  ingredients: Layer[];
  layers: Layer[];
  total: number;
  color: string;
  createdAt: string;
  hiddenRecipeId?: string;
};
export type Discovery = { id: string; discoveredAt: string };
export type Settings = { reducedMotion: boolean; soundEnabled: boolean; soundVolume: number };
export type SaveData = {
  format: "drink-lab";
  version: 1;
  recipes: Recipe[];
  discoveries: Discovery[];
  settings: Settings;
};
export const emptySave = (): SaveData => ({
  format: "drink-lab",
  version: 1,
  recipes: [],
  discoveries: [],
  settings: { reducedMotion: false, soundEnabled: true, soundVolume: 0.45 },
});
export function newRecipeId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // getRandomValues also works when testing on a phone over a local HTTP network.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function createRecipe(layers: Layer[], name: string): Recipe {
  return {
    id: newRecipeId(),
    name: name.trim() || "無名のドリンク",
    ingredients: ingredients(layers),
    layers: layers.map((l) => ({ ...l })),
    total: totalVolume(layers),
    color: mixColor(layers),
    createdAt: new Date().toISOString(),
    hiddenRecipeId: matchHiddenRecipe(layers)?.id,
  };
}
export function discover(
  save: SaveData,
  layers: Layer[],
  now = new Date().toISOString(),
): { data: SaveData; id?: string; isNew: boolean } {
  const match = matchHiddenRecipe(layers);
  if (!match) return { data: save, isNew: false };
  if (save.discoveries.some((d) => d.id === match.id))
    return { data: save, id: match.id, isNew: false };
  return {
    data: {
      ...save,
      discoveries: [...save.discoveries, { id: match.id, discoveredAt: now }],
    },
    id: match.id,
    isNew: true,
  };
}
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const date = (v: unknown): v is string =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}T/.test(v) &&
  Number.isFinite(Date.parse(v));
const uuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
const validId = (v: unknown): v is string =>
  hiddenRecipes.some((r) => r.id === v);
const fail = (): never => {
  throw new Error(
    "セーブデータの形式が正しくありません。Drink Labから書き出したJSONを選んでください。",
  );
};
function parseLayers(v: unknown): Layer[] {
  if (!Array.isArray(v) || !v.length || v.length > 10000) return fail();
  return v.map((l) => {
    if (
      !record(l) ||
      !drinks.some((d) => d.id === l.drinkId) ||
      typeof l.ml !== "number" ||
      !Number.isFinite(l.ml) ||
      l.ml <= 0 ||
      l.ml > CAPACITY
    )
      return fail();
    return { drinkId: l.drinkId as Layer["drinkId"], ml: l.ml };
  });
}
export function validateSave(v: unknown): SaveData {
  if (
    !record(v) ||
    v.format !== "drink-lab" ||
    v.version !== 1 ||
    !Array.isArray(v.recipes) ||
    v.recipes.length > 10000 ||
    !Array.isArray(v.discoveries) ||
    !record(v.settings) ||
    typeof v.settings.reducedMotion !== "boolean"
  )
    return fail();
  // Phase 2 version-1 data has no sound keys. Migrate additively, without clearing any records.
  if ((v.settings.soundEnabled !== undefined && typeof v.settings.soundEnabled !== 'boolean') ||
      (v.settings.soundVolume !== undefined && (typeof v.settings.soundVolume !== 'number' || !Number.isFinite(v.settings.soundVolume) || v.settings.soundVolume < 0 || v.settings.soundVolume > 1))) return fail();
  const ids = new Set<string>();
  const recipes: Recipe[] = v.recipes.map((raw) => {
    if (
      !record(raw) ||
      !uuid(raw.id) ||
      ids.has(raw.id.toLowerCase()) ||
      typeof raw.name !== "string" ||
      !raw.name.trim() ||
      raw.name.length > 80 ||
      !date(raw.createdAt)
    )
      return fail();
    ids.add(raw.id.toLowerCase());
    const layers = parseLayers(raw.layers),
      total = totalVolume(layers),
      aggregate = ingredients(layers);
    if (
      total > CAPACITY + 1e-7 ||
      typeof raw.total !== "number" ||
      !Number.isFinite(raw.total) ||
      Math.abs(raw.total - total) > 1e-7 ||
      raw.color !== mixColor(layers)
    )
      return fail();
    const stored = parseLayers(raw.ingredients);
    if (
      stored.length !== aggregate.length ||
      new Set(stored.map((l) => l.drinkId)).size !== stored.length ||
      stored.some(
        (l) =>
          Math.abs(
            l.ml - (aggregate.find((a) => a.drinkId === l.drinkId)?.ml ?? -1),
          ) > 1e-7,
      )
    )
      return fail();
    if (
      raw.hiddenRecipeId !== undefined &&
      (!validId(raw.hiddenRecipeId) ||
        matchHiddenRecipe(layers)?.id !== raw.hiddenRecipeId)
    )
      return fail();
    return {
      id: raw.id.toLowerCase(),
      name: raw.name,
      layers,
      ingredients: aggregate,
      total,
      color: mixColor(layers),
      createdAt: raw.createdAt,
      ...(raw.hiddenRecipeId
        ? { hiddenRecipeId: raw.hiddenRecipeId as string }
        : {}),
    };
  });
  const discovered = new Set<string>();
  const discoveries: Discovery[] = v.discoveries.map((d) => {
    if (
      !record(d) ||
      !validId(d.id) ||
      !date(d.discoveredAt) ||
      discovered.has(d.id as string)
    )
      return fail();
    discovered.add(d.id as string);
    return { id: d.id as string, discoveredAt: d.discoveredAt };
  });
  return {
    format: "drink-lab",
    version: 1,
    recipes,
    discoveries,
    settings: { reducedMotion: v.settings.reducedMotion, soundEnabled: v.settings.soundEnabled === undefined ? true : v.settings.soundEnabled as boolean, soundVolume: v.settings.soundVolume === undefined ? 0.45 : v.settings.soundVolume as number },
  };
}
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export function parseImport(text: string): SaveData {
  if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES)
    throw new Error("ファイルは5MB以内にしてください。");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("JSONを読み取れませんでした。ファイルを確認してください。");
  }
  return validateSave(parsed);
}
