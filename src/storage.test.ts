import { describe, expect, it, vi } from "vitest";
import { IDBFactory, IDBDatabase } from "fake-indexeddb";
import { createStorage } from "./storage";
import { createRecipe, discover, emptySave, type SaveData } from "./saveData";
import { hiddenRecipes, targetLayers } from "./hiddenRecipes";
describe("IndexedDBの保存", () => {
  it("空のDBを初期化し、別インスタンスでもレシピ・発見・設定が残る", async () => {
    const factory = new IDBFactory(),
      storage = createStorage(factory);
    expect(await storage.load()).toEqual(emptySave());
    const data = discover(emptySave(), targetLayers(hiddenRecipes[0])).data;
    data.recipes.push(createRecipe(targetLayers(hiddenRecipes[0]), "テスト"));
    data.settings.reducedMotion = true;
    await storage.save(data);
    expect(await createStorage(factory).load()).toEqual(data);
    data.recipes[0].name = "改名";
    await storage.save(data);
    expect((await storage.load()).recipes[0].name).toBe("改名");
    data.recipes = [];
    await storage.save(data);
    expect((await storage.load()).recipes).toEqual([]);
    expect((await storage.load()).discoveries).toHaveLength(1);
  });
  it("自由レシピがなくても発見を永続化、初回だけNEW", async () => {
    const storage = createStorage(new IDBFactory());
    const first = discover(
      await storage.load(),
      targetLayers(hiddenRecipes[14]),
    );
    await storage.save(first.data);
    const result = discover(
      await storage.load(),
      targetLayers(hiddenRecipes[14]),
    );
    expect(result.isNew).toBe(false);
    expect(result.data.recipes).toHaveLength(0);
    expect(result.data.discoveries).toHaveLength(1);
  });
  it("インポートは全体を検証してから置換、不正なら既存データを維持", async () => {
    const storage = createStorage(new IDBFactory());
    const original = emptySave();
    original.recipes.push(
      createRecipe([{ drinkId: "water", ml: 50 }], "もとの一杯"),
    );
    await storage.save(original);
    await expect(storage.import("{")).rejects.toThrow();
    expect(await storage.load()).toEqual(original);
    const invalid = { ...emptySave(), recipes: [{ name: "不正" }] };
    await expect(storage.import(JSON.stringify(invalid))).rejects.toThrow();
    expect(await storage.load()).toEqual(original);
    const replacement = discover(
      emptySave(),
      targetLayers(hiddenRecipes[1]),
    ).data;
    await storage.import(JSON.stringify(replacement));
    expect(await storage.load()).toEqual(replacement);
  });
  it("保存失敗を呼び出し側に伝え、既存値を保持", async () => {
    const factory = new IDBFactory(),
      storage = createStorage(factory),
      original = emptySave();
    await storage.save(original);
    const invalid = {
      ...original,
      recipes: [{ name: "不正" }],
    } as unknown as SaveData;
    await expect(storage.save(invalid)).rejects.toThrow();
    expect(await storage.load()).toEqual(original);
    const unavailable = {
      open: () => {
        throw new Error("blocked");
      },
    } as unknown as IDBFactory;
    await expect(createStorage(unavailable).load()).rejects.toThrow("blocked");
    await expect(createStorage(unavailable).save(original)).rejects.toThrow(
      "blocked",
    );
  });
  it("トランザクションが中断しても既存データを維持する", async () => {
    const storage = createStorage(new IDBFactory()),
      original = emptySave();
    await storage.save(original);
    const transaction = IDBDatabase.prototype.transaction;
    const spy = vi
      .spyOn(IDBDatabase.prototype, "transaction")
      .mockImplementation(function (
        this: IDBDatabase,
        ...args: Parameters<typeof transaction>
      ) {
        const tx = transaction.apply(this, args);
        if (args[1] === "readwrite") queueMicrotask(() => tx.abort());
        return tx;
      });
    try {
      await expect(
        storage.save(discover(original, targetLayers(hiddenRecipes[0])).data),
      ).rejects.toThrow();
    } finally {
      spy.mockRestore();
    }
    expect(await storage.load()).toEqual(original);
  });
  it("破損した既存データの読み込みを拒否し、勝手に初期化しない", async () => {
    const factory = new IDBFactory(),
      storage = createStorage(factory);
    await storage.load();
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open("drink-lab", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("save", "readwrite");
      tx.objectStore("save").put({ format: "broken" }, "current");
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
    db.close();
    await expect(storage.load()).rejects.toThrow("形式");
    await expect(storage.load()).rejects.toThrow("形式");
  });
  it("全データ初期化後も再読み込みできる", async () => {
    const storage = createStorage(new IDBFactory());
    await storage.save(
      discover(emptySave(), targetLayers(hiddenRecipes[0])).data,
    );
    await storage.save(emptySave());
    expect(await storage.load()).toEqual(emptySave());
  });
});
