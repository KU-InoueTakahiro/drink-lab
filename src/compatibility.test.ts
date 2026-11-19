import { describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { createRecipe, emptySave, parseImport, validateSave } from "./saveData";
import { createStorage } from "./storage";
const phase2 = () => ({
  ...emptySave(),
  recipes: [
    createRecipe([{ drinkId: "water", ml: 300 }], "前のバージョンの水"),
  ],
  discoveries: [{ id: "pure-water", discoveredAt: "2026-11-19T00:00:00.000Z" }],
  settings: { reducedMotion: true },
});
describe("Phase 2との互換性", () => {
  it("古いJSONを初期化せず音声の初期値だけ補う", () => {
    const old = phase2(),
      data = parseImport(JSON.stringify(old));
    expect(data.recipes).toEqual(old.recipes);
    expect(data.discoveries).toEqual(old.discoveries);
    expect(data.version).toBe(1);
    expect(data.settings).toEqual({
      reducedMotion: true,
      soundEnabled: true,
      soundVolume: 0.45,
    });
  });
  it("既存IndexedDBのバージョン・レコードを保持する", async () => {
    const factory = new IDBFactory(),
      store = createStorage(factory),
      old = phase2();
    await store.load();
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = factory.open("drink-lab", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("save", "readwrite");
      tx.objectStore("save").put(old, "current");
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
    expect(db.version).toBe(1);
    db.close();
    const migrated = await store.load();
    expect(migrated.recipes).toEqual(old.recipes);
    expect(migrated.discoveries).toEqual(old.discoveries);
    migrated.settings.soundVolume = 0.2;
    await store.save(migrated);
    expect((await store.load()).settings.soundVolume).toBe(0.2);
  });
  it("新しい設定の不正値は拒否する", () => {
    for (const volume of [-1, 1.1, NaN, "0.5"])
      expect(() =>
        validateSave({
          ...emptySave(),
          settings: { reducedMotion: false, soundVolume: volume },
        }),
      ).toThrow();
    expect(() =>
      validateSave({
        ...emptySave(),
        settings: { reducedMotion: false, soundEnabled: "yes" },
      }),
    ).toThrow();
  });
});
