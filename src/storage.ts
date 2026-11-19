import {
  emptySave,
  parseImport,
  validateSave,
  type SaveData,
} from "./saveData";
const DB_NAME = "drink-lab";
function open(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DB_NAME, 1);
    let settled = false;
    request.onupgradeneeded = () => {
      request.result.createObjectStore("save");
    };
    request.onerror = () => {
      settled = true;
      reject(request.error ?? new Error("保存領域を開けませんでした。"));
    };
    request.onblocked = () => {
      settled = true;
      reject(new Error("ほかのタブを閉じてから再読み込みしてください。"));
    };
    request.onsuccess = () => {
      if (settled) {
        request.result.close();
        return;
      }
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
  });
}
export function createStorage(factory: IDBFactory) {
  return {
    async load(): Promise<SaveData> {
      const db = await open(factory);
      try {
        const value = await new Promise<unknown>((resolve, reject) => {
          const tx = db.transaction("save", "readonly");
          const request = tx.objectStore("save").get("current");
          tx.oncomplete = () => resolve(request.result);
          tx.onabort = () =>
            reject(tx.error ?? new Error("データを読み込めませんでした。"));
          tx.onerror = () => reject(tx.error);
        });
        return value === undefined ? emptySave() : validateSave(value);
      } finally {
        db.close();
      }
    },
    async save(data: SaveData): Promise<void> {
      const clean = validateSave(data);
      const db = await open(factory);
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction("save", "readwrite");
          tx.objectStore("save").put(clean, "current");
          tx.oncomplete = () => resolve();
          tx.onabort = () =>
            reject(
              tx.error ??
                new Error("保存できませんでした。空き容量を確認してください。"),
            );
          tx.onerror = () => reject(tx.error);
        });
      } finally {
        db.close();
      }
    },
    async import(text: string): Promise<SaveData> {
      const data = parseImport(text); // Validate completely before opening a write transaction.
      await this.save(data);
      return data;
    },
  };
}
