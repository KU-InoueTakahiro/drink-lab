import { useEffect, useRef, useState } from "react";
import { DrinkMaker } from "./DrinkMaker";
import { Glass } from "./Glass";
import { drinks, type Layer } from "./drinks";
import { mixColor, totalVolume } from "./engine";
import { hiddenRecipes, ingredients, targetLayers } from "./hiddenRecipes";
import {
  createRecipe,
  discover,
  emptySave,
  MAX_IMPORT_BYTES,
  parseImport,
  type Recipe,
  type SaveData,
} from "./saveData";
import { sound, type AudioStatus } from "./audio";
import { ShareDialog } from "./ShareDialog";
import type { ShareDrink } from "./shareImage";
import { createStorage } from "./storage";

type Screen =
  | "home"
  | "create"
  | "complete"
  | "collection"
  | "detail"
  | "discoveries"
  | "hidden-detail"
  | "settings";
const dateLabel = (date: string) =>
  new Date(date).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
const mlLabel = (ml: number) => Number(ml.toFixed(1)).toLocaleString("ja-JP");
const drinkName = (id: string) => drinks.find((d) => d.id === id)?.name;
function DrinkGlass({
  layers,
  locked = false,
}: {
  layers: Layer[];
  locked?: boolean;
}) {
  return (
    <div className={`collection-glass ${locked ? "locked" : ""}`}>
      <Glass
        layers={locked ? [{ drinkId: "water", ml: 220 }] : layers}
        active={null}
        mixing={false}
        mixed
      />
      {locked && (
        <span className="glass-lock" aria-hidden="true">
          ?
        </span>
      )}
    </div>
  );
}
function Formula({
  layers,
  order = false,
}: {
  layers: Layer[];
  order?: boolean;
}) {
  const total = totalVolume(layers);
  return (
    <div className="formula">
      <h3>{order ? "注いだ順番" : "この一杯の配合"}</h3>
      {(order ? layers : ingredients(layers)).map((l, i) => (
        <div className="formula-row" key={`${l.drinkId}-${i}`}>
          <span
            className="color-dot"
            style={{
              background: drinks.find((d) => d.id === l.drinkId)!.color,
            }}
          />
          <span>
            {order && `${i + 1}. `}
            {drinkName(l.drinkId)}
          </span>
          <b>{mlLabel(l.ml)} ml</b>
          {!order && <small>{((l.ml / total) * 100).toFixed(1)}%</small>}
        </div>
      ))}
      <div className="formula-total">
        合計 <b>{mlLabel(total)} ml</b>
      </div>
    </div>
  );
}
function download(data: SaveData, label = "save") {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `drink-lab-${label}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function App() {
  const [shareDrink, setShareDrink] = useState<ShareDrink | null>(null);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>("idle");
  const [volume, setVolume] = useState(45);
  const [screen, setScreen] = useState<Screen>("home");
  const [hasGame, setHasGame] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [crafting, setCrafting] = useState(false);
  const [drinkNameInput, setDrinkNameInput] = useState("");
  const [stack, setStack] = useState<
    { screen: Screen; selectedId: string; hiddenId: string; name: string }[]
  >([]);
  const [data, setData] = useState<SaveData>(emptySave);
  const dataRef = useRef(data);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pendingSave, setPendingSave] = useState<SaveData | null>(null);
  const [finished, setFinished] = useState<Layer[]>([]);
  const [found, setFound] = useState<{ id?: string; isNew: boolean }>({
    isNew: false,
  });
  const [name, setName] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [hiddenId, setHiddenId] = useState("");
  const [guide, setGuide] = useState<Layer[] | undefined>();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("new");
  const [importPreview, setImportPreview] = useState<SaveData | null>(null);
  const [backup, setBackup] = useState(true);
  const heading = useRef<HTMLHeadingElement>(null);
  const loadGeneration = useRef(0);
  const storeRef = useRef<ReturnType<typeof createStorage> | null>(null);
  function store() {
    if (!storeRef.current) {
      if (!globalThis.indexedDB)
        throw new Error("このブラウザではIndexedDBを使用できません。");
      storeRef.current = createStorage(globalThis.indexedDB);
    }
    return storeRef.current;
  }
  useEffect(() => {
    sound.configure(data.settings);
    setVolume(Math.round(data.settings.soundVolume * 100));
  }, [data.settings.soundEnabled, data.settings.soundVolume]);
  useEffect(() => {
    const unsubscribe = sound.subscribe(setAudioStatus);
    const inactive = () => sound.setForeground(false);
    const active = () => sound.setForeground(!document.hidden);
    window.addEventListener("blur", inactive);
    window.addEventListener("focus", active);
    document.addEventListener("visibilitychange", active);
    return () => {
      unsubscribe();
      sound.stopAll();
      window.removeEventListener("blur", inactive);
      window.removeEventListener("focus", active);
      document.removeEventListener("visibilitychange", active);
    };
  }, []);
  function userGesture(event: React.SyntheticEvent) {
    if (loading || !loaded) return;
    if (event.type === "keydown") {
      const key = event as React.KeyboardEvent;
      if (key.repeat || !["Enter", " "].includes(key.key)) return;
    }
    sound.setForeground(true);
    sound.unlock();
    if ((event.target as HTMLElement).closest("button:not(:disabled)"))
      sound.play("button");
  }
  async function saveVolume() {
    const value = volume / 100;
    if (
      value === dataRef.current.settings.soundVolume ||
      !loaded ||
      pendingSave ||
      busyRef.current
    )
      return;
    await commit({
      ...dataRef.current,
      settings: { ...dataRef.current.settings, soundVolume: value },
    });
  }
  async function load() {
    const generation = ++loadGeneration.current;
    setLoading(true);
    setLoaded(false);
    setError("");
    try {
      const next = await store().load();
      if (generation !== loadGeneration.current) return;
      dataRef.current = next;
      setData(next);
      setLoaded(true);
    } catch {
      if (generation !== loadGeneration.current) return;
      setLoaded(false);
      setError(
        "セーブデータを読み込めませんでした。ゲームは遊べますが、保存は停止しています。設定から再読み込み・インポート・初期化を選べます。",
      );
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    heading.current?.focus();
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [screen]);
  function go(next: Screen) {
    if (busyRef.current || crafting || next === screen) return;
    setStack((old) => [...old, { screen, selectedId, hiddenId, name }]);
    setScreen(next);
    setMessage("");
  }
  function back() {
    if (busyRef.current || crafting) return;
    const previous = stack.at(-1);
    setScreen(previous?.screen ?? "home");
    if (previous) {
      setSelectedId(previous.selectedId);
      setHiddenId(previous.hiddenId);
      setName(previous.name);
    }
    setStack((old) => old.slice(0, -1));
    setMessage("");
  }
  async function commit(next: SaveData, force = false): Promise<boolean> {
    if (busyRef.current || (!loaded && !force)) return false;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await store().save(next);
      dataRef.current = next;
      setData(next);
      setPendingSave(null);
      setLoaded(true);
      return true;
    } catch {
      setError(
        "保存できませんでした。空き容量やブラウザの設定を確認し、「保存を再試行」を押してください。画面を閉じると未保存の変更は失われます。",
      );
      setPendingSave(next);
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function complete(layers: Layer[]) {
    setFinished(layers);
    setDrinkNameInput("");
    const result = discover(pendingSave ?? dataRef.current, layers);
    setFound({ id: result.id, isNew: result.isNew });
    sound.play(result.isNew ? "discovery" : "complete");
    setStack((old) => [
      ...old,
      { screen: "create", selectedId, hiddenId, name },
    ]);
    setScreen("complete");
    if (result.isNew && pendingSave) setPendingSave(result.data);
    else if (result.isNew && loaded) await commit(result.data);
  }
  function newDrink(layers?: Layer[]) {
    if (busyRef.current || crafting) return;
    setGameKey((key) => key + 1);
    setHasGame(true);
    setGuide(layers);
    go("create");
  }
  async function register() {
    if (!finished.length) return;
    const recipe = createRecipe(finished, drinkNameInput);
    if (
      await commit({
        ...dataRef.current,
        recipes: [...dataRef.current.recipes, recipe],
      })
    ) {
      sound.play("register");
      setMessage(`「${recipe.name}」を図鑑に登録しました！`);
    }
  }
  const selected = data.recipes.find((r) => r.id === selectedId);
  const secret = hiddenRecipes.find((r) => r.id === hiddenId);
  const match = hiddenRecipes.find((r) => r.id === found.id);
  const writable = loaded && !busy && !pendingSave;
  const recipeList = data.recipes
    .filter((r) =>
      r.name
        .toLocaleLowerCase("ja-JP")
        .includes(search.toLocaleLowerCase("ja-JP")),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name, "ja")
        : sort === "old"
          ? a.createdAt.localeCompare(b.createdAt)
          : b.createdAt.localeCompare(a.createdAt),
    );
  const openRecipe = (recipe: Recipe) => {
    setSelectedId(recipe.id);
    setName(recipe.name);
    go("detail");
  };
  const card = (recipe: Recipe) => (
    <button
      className="recipe-card"
      key={recipe.id}
      onClick={() => openRecipe(recipe)}
    >
      <span className="card-no">
        No.{" "}
        {String(data.recipes.findIndex((r) => r.id === recipe.id) + 1).padStart(
          3,
          "0",
        )}
      </span>
      <DrinkGlass layers={recipe.layers} />
      <strong>{recipe.name}</strong>
      <span className="card-hex">
        <i style={{ background: recipe.color }} />
        {recipe.color}
      </span>
      <time dateTime={recipe.createdAt}>
        {new Date(recipe.createdAt).toLocaleDateString("ja-JP")}
      </time>
    </button>
  );
  return (
    <div
      className={`phase-three ${data.settings.reducedMotion ? "reduced-motion" : ""}`}
      onPointerDownCapture={userGesture}
      onKeyDownCapture={userGesture}
    >
      <nav className="game-nav" aria-label="メインメニュー">
        <button
          disabled={busy || crafting}
          onClick={() => {
            setStack([]);
            setScreen("home");
          }}
          aria-current={screen === "home" ? "page" : undefined}
        >
          ⌂ ホーム
        </button>
        <button
          disabled={busy || crafting}
          onClick={() => go("collection")}
          aria-current={screen === "collection" ? "page" : undefined}
        >
          ▤ 自由レシピ
        </button>
        <button
          disabled={busy || crafting}
          onClick={() => go("discoveries")}
          aria-current={screen === "discoveries" ? "page" : undefined}
        >
          ✧ 発見図鑑
        </button>
        <button
          disabled={busy || crafting}
          onClick={() => go("settings")}
          aria-current={screen === "settings" ? "page" : undefined}
        >
          ⚙ 設定
        </button>
      </nav>
      {shareDrink && (
        <ShareDialog drink={shareDrink} onClose={() => setShareDrink(null)} />
      )}
      <div className="notices">
        {data.settings.soundEnabled &&
          (audioStatus === "blocked" || audioStatus === "unavailable") && (
            <p className="audio-notice" role="status">
              {audioStatus === "unavailable"
                ? "この環境では効果音を再生できません。音なしでそのまま遊べます。"
                : "音声の再生が制限されています。音なしで遊ぶか、下のボタンでお試しください。"}
              {audioStatus === "blocked" && (
                <button
                  className="soft-button"
                  onClick={() => {
                    sound.unlock();
                    sound.play("button");
                  }}
                >
                  効果音を有効にする
                </button>
              )}
            </p>
          )}
        {loading && <p role="status">セーブデータを読み込み中…</p>}
        {error && (
          <div className="error-notice" role="alert">
            {error}
            {pendingSave && (
              <button
                onClick={async () => {
                  if (await commit(pendingSave))
                    setMessage("未保存の変更を保存しました。");
                }}
                disabled={busy}
              >
                保存を再試行
              </button>
            )}
          </div>
        )}
        {message && (
          <p
            className="saved-notice"
            key={message + data.recipes.length}
            role="status"
          >
            ✦ {message}
          </p>
        )}
      </div>
      {hasGame && (
        <div hidden={screen !== "create"}>
          <DrinkMaker
            key={gameKey}
            onComplete={(layers) => void complete(layers)}
            guide={guide}
            reducedMotion={data.settings.reducedMotion}
            onMixingChange={setCrafting}
            visible={screen === "create"}
          />
        </div>
      )}
      {screen !== "create" && (
        <div className="collection-shell">
          <header className="page-header">
            {screen !== "home" && (
              <button className="soft-button back-button" onClick={back}>
                ← 戻る
              </button>
            )}
            <span className="eyebrow">KIMAGURE JIYUCHO · DRINK LAB</span>
            <h1 tabIndex={-1} ref={heading}>
              {
                {
                  home: "まぜまぜドリンクラボ",
                  complete: "ドリンク完成！",
                  collection: "自由レシピ図鑑",
                  detail: "レシピのくわしいこと",
                  discoveries: "隠しレシピ発見図鑑",
                  "hidden-detail": "発見したドリンク",
                  settings: "ラボの設定",
                }[screen]
              }
            </h1>
            <p>
              {screen === "collection"
                ? "偶然のひと色も、あなたの大切なコレクション。"
                : screen === "discoveries"
                  ? "ヒントをたよりに、まだ知らない一杯を見つけよう。"
                  : screen === "home"
                    ? "好きなものを、好きなだけ。今日はどんな色になる？"
                    : ""}
            </p>
          </header>
          {screen === "home" && (
            <>
              <section className="home-hero">
                <div className="hero-glasses">
                  <DrinkGlass layers={[{ drinkId: "melon", ml: 220 }]} />
                  <DrinkGlass
                    layers={[
                      { drinkId: "orange", ml: 150 },
                      { drinkId: "grape", ml: 100 },
                    ]}
                  />
                  <DrinkGlass
                    layers={[
                      { drinkId: "calpis", ml: 100 },
                      { drinkId: "grape", ml: 100 },
                    ]}
                  />
                </div>
                <span className="pill">あなただけの色、見つけよう。</span>
                <h2>
                  ひとしずくから、
                  <br />
                  小さな発見がはじまる。
                </h2>
                <button className="mix-button" onClick={() => newDrink()}>
                  ✧ ドリンクをつくる ✧
                </button>
              </section>
              <section className="home-stats">
                <button onClick={() => go("collection")}>
                  <b>{data.recipes.length}</b>
                  <span>自由レシピ図鑑 →</span>
                </button>
                <button onClick={() => go("discoveries")}>
                  <b>
                    {data.discoveries.length}
                    <small> / 15</small>
                  </b>
                  <span>
                    発見図鑑 ·{" "}
                    {Math.round((data.discoveries.length / 15) * 100)}% →
                  </span>
                </button>
              </section>
              <section>
                <div className="collection-heading">
                  <h2>最近のひと色</h2>
                  <button
                    className="text-button"
                    onClick={() => go("collection")}
                  >
                    すべて見る →
                  </button>
                </div>
                {data.recipes.length ? (
                  <div className="recipe-grid recent">
                    {[...data.recipes]
                      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                      .slice(0, 3)
                      .map(card)}
                  </div>
                ) : (
                  <div className="empty-collection">
                    <span>✧</span>
                    <p>
                      図鑑は、まだまっしろ。
                      <br />
                      最初の一杯をつくってみよう。
                    </p>
                  </div>
                )}
              </section>
            </>
          )}
          {screen === "complete" && (
            <section className="detail-panel completion">
              <div
                className={
                  found.isNew
                    ? `special-glass rarity-${(match?.priority ?? 0) >= 50 ? "rare" : (match?.priority ?? 0) >= 20 ? "special" : "classic"}`
                    : ""
                }
              >
                {match && (
                  <div
                    className={`discovery-banner ${found.isNew ? "new-discovery" : ""}`}
                    role="status"
                  >
                    <b>
                      {found.isNew
                        ? "NEW! 新しいドリンクを発見！"
                        : "✧ 発見済みのドリンク"}
                    </b>
                    <h2>{match.name}</h2>
                    <p>{match.description}</p>
                    {!loaded && (
                      <small>
                        保存領域を読み込めていないため、発見は未保存です。
                      </small>
                    )}
                  </div>
                )}
                <DrinkGlass layers={finished} />
                <div className="color-label">
                  <i style={{ background: mixColor(finished) }} />
                  {mixColor(finished)}
                </div>
              </div>
              <div>
                <Formula layers={finished} />
                <label className="field">
                  ドリンク名
                  <input
                    maxLength={80}
                    value={drinkNameInput}
                    onChange={(e) => setDrinkNameInput(e.target.value)}
                    placeholder="無名のドリンク"
                  />
                </label>
                <button
                  className="mix-button"
                  disabled={!writable}
                  onClick={() => void register()}
                >
                  {busy ? "保存しています…" : "図鑑に登録"}
                </button>
                <button
                  className="share-open-button"
                  onClick={() =>
                    setShareDrink({
                      name: drinkNameInput,
                      layers: finished.map((l) => ({ ...l })),
                    })
                  }
                >
                  ↑ この一杯を画像でシェア
                </button>
                <p className="field-note">
                  同じ配合も、別の名前で何度でも登録できます。
                </p>
                <div className="action-row">
                  <button
                    className="soft-button"
                    onClick={() => go("collection")}
                  >
                    図鑑を見る
                  </button>
                  <button className="soft-button" onClick={() => newDrink()}>
                    もう一杯つくる
                  </button>
                </div>
              </div>
            </section>
          )}
          {screen === "collection" && (
            <>
              <div className="collection-toolbar">
                <label className="field">
                  名前で検索
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ドリンクを探す"
                  />
                </label>
                <label className="field">
                  並べ替え
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="new">新しい順</option>
                    <option value="old">古い順</option>
                    <option value="name">名前順</option>
                  </select>
                </label>
              </div>
              <p className="count-label">
                {recipeList.length} 杯のコレクション
              </p>
              {recipeList.length ? (
                <div className="recipe-grid">{recipeList.map(card)}</div>
              ) : (
                <div className="empty-collection">
                  <span>◌</span>
                  <p>
                    {search
                      ? "その名前のドリンクは見つかりませんでした。"
                      : "あなたの一杯を、ここに集めよう。"}
                  </p>
                  <button className="soft-button" onClick={() => newDrink()}>
                    ドリンクをつくる
                  </button>
                </div>
              )}
            </>
          )}
          {screen === "detail" &&
            (selected ? (
              <section className="detail-panel">
                <div>
                  <DrinkGlass layers={selected.layers} />
                  <div className="color-label">
                    <i style={{ background: selected.color }} />
                    {selected.color}
                  </div>
                  <p className="date-label">
                    作成：{dateLabel(selected.createdAt)}
                  </p>
                  {selected.hiddenRecipeId && (
                    <span className="pill">
                      ✧{" "}
                      {
                        hiddenRecipes.find(
                          (r) => r.id === selected.hiddenRecipeId,
                        )?.name
                      }
                    </span>
                  )}
                </div>
                <div>
                  <h2>{selected.name}</h2>
                  <Formula layers={selected.layers} />
                  <Formula layers={selected.layers} order />
                  <label className="field">
                    名前の変更
                    <input
                      maxLength={80}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  <div className="action-row">
                    <button
                      className="soft-button"
                      disabled={!writable}
                      onClick={async () => {
                        if (
                          await commit({
                            ...dataRef.current,
                            recipes: dataRef.current.recipes.map((r) =>
                              r.id === selected.id
                                ? {
                                    ...r,
                                    name: name.trim() || "無名のドリンク",
                                  }
                                : r,
                            ),
                          })
                        )
                          setMessage("名前を変更しました。");
                      }}
                    >
                      名前を保存
                    </button>
                    <button
                      className="soft-button danger"
                      disabled={!writable}
                      onClick={async () => {
                        if (
                          !window.confirm(
                            `「${selected.name}」を削除しますか？この操作は元に戻せません。`,
                          )
                        )
                          return;
                        if (
                          await commit({
                            ...dataRef.current,
                            recipes: dataRef.current.recipes.filter(
                              (r) => r.id !== selected.id,
                            ),
                          })
                        ) {
                          setScreen("collection");
                          setStack([
                            {
                              screen: "home",
                              selectedId: "",
                              hiddenId: "",
                              name: "",
                            },
                          ]);
                          setMessage("レシピを削除しました。");
                        }
                      }}
                    >
                      削除
                    </button>
                  </div>
                  <button
                    className="share-open-button"
                    onClick={() =>
                      setShareDrink({
                        name: selected.name,
                        layers: selected.layers.map((l) => ({ ...l })),
                      })
                    }
                  >
                    ↑ このレシピを画像でシェア
                  </button>
                  <button
                    className="mix-button"
                    onClick={() => newDrink(selected.layers)}
                  >
                    ✎ このレシピを再現する
                  </button>
                  <button
                    className="text-button"
                    onClick={() => go("collection")}
                  >
                    一覧に戻る →
                  </button>
                </div>
              </section>
            ) : (
              <div className="empty-collection">
                <p>このレシピは削除されています。</p>
                <button
                  className="soft-button"
                  onClick={() => go("collection")}
                >
                  一覧に戻る
                </button>
              </div>
            ))}
          {screen === "discoveries" && (
            <>
              <section className="discovery-progress">
                <span>ラボの発見記録</span>
                <strong>
                  {data.discoveries.length}
                  <small> / 15</small>
                </strong>
                <b>{Math.round((data.discoveries.length / 15) * 100)}%</b>
                <progress
                  value={data.discoveries.length}
                  max={15}
                  aria-label="隠しレシピ発見率"
                />
              </section>
              <div className="secret-grid">
                {hiddenRecipes.map((r, i) => {
                  const unlocked = data.discoveries.find((d) => d.id === r.id);
                  return (
                    <button
                      className={`secret-card ${unlocked ? "unlocked" : ""}`}
                      key={r.id}
                      onClick={() => {
                        setHiddenId(r.id);
                        go("hidden-detail");
                      }}
                    >
                      <span className="card-no">
                        EXPERIMENT {String(i + 1).padStart(2, "0")}{" "}
                        <span>{unlocked ? "✦ 発見済み" : "未発見"}</span>
                      </span>
                      <DrinkGlass locked={!unlocked} layers={targetLayers(r)} />
                      <h2>{unlocked ? r.name : "？？？"}</h2>
                      <p>{unlocked ? r.description : r.hint}</p>
                      {unlocked && (
                        <>
                          <div className="secret-formula">
                            {Object.entries(r.ratios).map(([id, ratio]) => (
                              <span key={id}>
                                {drinkName(id)} {ratio}%
                              </span>
                            ))}
                          </div>
                          <time
                            className="discovered-date"
                            dateTime={unlocked.discoveredAt}
                          >
                            発見 {dateLabel(unlocked.discoveredAt)}
                          </time>
                        </>
                      )}
                      <span className="secret-link">
                        {unlocked ? "配合を見てみる →" : "ヒントを読む →"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {screen === "hidden-detail" && secret && (
            <section className="detail-panel">
              <div>
                <DrinkGlass
                  locked={!data.discoveries.some((d) => d.id === secret.id)}
                  layers={targetLayers(secret)}
                />
              </div>
              <div>
                {data.discoveries.find((d) => d.id === secret.id) ? (
                  <>
                    <span className="pill">✦ 発見済み</span>
                    <h2>{secret.name}</h2>
                    <p>{secret.description}</p>
                    <Formula layers={targetLayers(secret)} />
                    <p className="field-note">
                      目標配合。各材料±{secret.tolerance}ポイント、合計
                      {secret.minimumVolume}ml以上で発見。
                    </p>
                    <p className="date-label">
                      発見：
                      {dateLabel(
                        data.discoveries.find((d) => d.id === secret.id)!
                          .discoveredAt,
                      )}
                    </p>
                    <button
                      className="mix-button"
                      onClick={() => newDrink(targetLayers(secret))}
                    >
                      この一杯をつくる
                    </button>
                  </>
                ) : (
                  <>
                    <span className="pill">未発見</span>
                    <h2>？？？</h2>
                    <h3>✎ 発見のヒント</h3>
                    <p className="hint-text">{secret.hint}</p>
                    <p className="field-note">
                      水だけの一杯は300ml。それ以外は100ml以上注いで、まぜてみよう。
                    </p>
                    <button className="mix-button" onClick={() => newDrink()}>
                      ラボで実験する
                    </button>
                  </>
                )}
              </div>
            </section>
          )}
          {screen === "settings" && (
            <section className="settings-panel">
              <h2>効果音</h2>
              <label className="toggle-row">
                <span>
                  効果音をONにする
                  <small>このゲームだけの、トクトク・しゅわしゅわ音。</small>
                </span>
                <input
                  type="checkbox"
                  checked={data.settings.soundEnabled}
                  disabled={!writable}
                  onChange={(event) => {
                    const settings = {
                      ...dataRef.current.settings,
                      soundEnabled: event.target.checked,
                    };
                    sound.configure(settings);
                    if (settings.soundEnabled) {
                      sound.unlock();
                      sound.play("button");
                    }
                    void commit({ ...dataRef.current, settings });
                  }}
                />
              </label>
              <label className="field volume-control">
                音量 <output>{volume}%</output>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  aria-label="効果音の音量"
                  aria-valuetext={`${volume}%`}
                  value={volume}
                  disabled={!writable}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setVolume(value);
                    sound.configure({
                      ...dataRef.current.settings,
                      soundVolume: value / 100,
                    });
                  }}
                  onPointerUp={() => void saveVolume()}
                  onKeyUp={() => void saveVolume()}
                  onBlur={() => void saveVolume()}
                />
              </label>
              <p className="field-note">
                音は最初の操作後に有効になります。音が出なくても、すべての情報は画面で確認できます。音量は指やキーを離すと自動保存します。
              </p>
              <button
                className="soft-button"
                disabled={!data.settings.soundEnabled}
                onClick={() => {
                  sound.unlock();
                  sound.play("complete");
                }}
              >
                ♪ 音をためす
              </button>
              <h2>あそび心地</h2>
              <label className="toggle-row">
                <span>
                  アニメーションを軽減する
                  <small>端末の軽減設定も自動的に反映します。</small>
                </span>
                <input
                  type="checkbox"
                  checked={data.settings.reducedMotion}
                  disabled={!writable}
                  onChange={(e) =>
                    void commit({
                      ...dataRef.current,
                      settings: {
                        ...dataRef.current.settings,
                        reducedMotion: e.target.checked,
                      },
                    })
                  }
                />
              </label>
              <h2>セーブデータ</h2>
              <p>
                このブラウザに自動保存します。端末の変更やブラウザデータの削除に備えて、JSONを保管しておくと安心です。
              </p>
              <div className="action-row">
                <button
                  className="soft-button"
                  onClick={() => download(dataRef.current)}
                  disabled={!loaded || busy}
                >
                  JSONエクスポート
                </button>
                <button
                  className="soft-button"
                  disabled={busy || !!pendingSave}
                  onClick={() => void load()}
                >
                  保存データを再読み込み
                </button>
              </div>
              <label className="field import-field">
                JSONからインポート
                <input
                  aria-label="JSONファイル"
                  type="file"
                  accept=".json,application/json"
                  disabled={busy || loading || !!pendingSave}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    setError("");
                    setImportPreview(null);
                    try {
                      if (file.size > MAX_IMPORT_BYTES)
                        throw new Error("ファイルは5MB以内にしてください。");
                      setImportPreview(parseImport(await file.text()));
                    } catch (err) {
                      setError(
                        err instanceof Error
                          ? err.message
                          : "読み込みに失敗しました。",
                      );
                    }
                  }}
                />
              </label>
              {importPreview && (
                <div className="import-preview">
                  <h3>このデータに入れ替えますか？</h3>
                  <p>
                    自由レシピ {importPreview.recipes.length}杯 ／ 発見{" "}
                    {importPreview.discoveries.length}種類
                  </p>
                  <p>
                    現在のデータを置き換えます。ファイルの検証は完了しています。
                  </p>
                  <label>
                    <input
                      type="checkbox"
                      checked={backup}
                      onChange={(e) => setBackup(e.target.checked)}
                      disabled={!loaded}
                    />{" "}
                    入れ替え前に現在のJSONをバックアップ
                  </label>
                  <div className="action-row">
                    <button
                      className="soft-button"
                      disabled={busy}
                      onClick={async () => {
                        if (backup && loaded)
                          download(dataRef.current, "backup");
                        if (await commit(importPreview, true)) {
                          setImportPreview(null);
                          setMessage("データをインポートしました。");
                        }
                      }}
                    >
                      インポートを確定
                    </button>
                    <button
                      className="soft-button"
                      disabled={busy}
                      onClick={() => setImportPreview(null)}
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
              <div className="danger-zone">
                <h3>全データの削除</h3>
                <p>レシピ・発見記録・設定がすべて初期化されます。</p>
                <button
                  className="soft-button danger"
                  disabled={busy || loading || !!pendingSave}
                  onClick={async () => {
                    if (
                      !window.confirm(
                        "すべてのレシピ・発見記録・設定を削除しますか？元に戻せません。必要な場合は先にJSONを書き出してください。",
                      )
                    )
                      return;
                    if (await commit(emptySave(), true)) {
                      setImportPreview(null);
                      setFinished([]);
                      setFound({ isNew: false });
                      setHasGame(false);
                      setStack([]);
                      setScreen("home");
                      setMessage("すべてのデータを初期化しました。");
                    }
                  }}
                >
                  全データを削除
                </button>
              </div>
              <small>
                プライベートブラウズや保存領域の制限により、保存できない場合があります。保存失敗時は画面に通知します。
              </small>
            </section>
          )}
          <footer>
            <a
              href="https://kimagure-jiyucho.com"
              target="_blank"
              rel="noreferrer"
            >
              ✳ きまぐれ自由帳 ↗
            </a>
            <span>DRINK LAB · vol. 03</span>
          </footer>
        </div>
      )}
    </div>
  );
}
