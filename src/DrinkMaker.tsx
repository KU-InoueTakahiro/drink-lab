import React, { useEffect, useRef, useState } from "react";
import { drinks, type DrinkId, type Layer } from "./drinks";
import {
  CAPACITY,
  MIN_POUR,
  RATE,
  mixColor,
  pour,
  totalVolume,
} from "./engine";
import { sound } from "./audio";
import { VolumeGauge } from "./VolumeGauge";
import { Glass } from "./Glass";
export function DrinkMaker({
  onComplete,
  guide,
  reducedMotion,
  onMixingChange,
  visible,
}: {
  onComplete: (layers: Layer[]) => void;
  guide?: Layer[];
  reducedMotion: boolean;
  onMixingChange: (active: boolean) => void;
  visible: boolean;
}) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const layerRef = useRef<Layer[]>([]);
  const [active, setActive] = useState<DrinkId | null>(null);
  const [history, setHistory] = useState<Layer[][]>([]);
  const [mixing, setMixing] = useState(false);
  const [settling, setSettling] = useState(0);
  const [mixed, setMixed] = useState(false);
  const [help, setHelp] = useState(false);
  const session = useRef<{
    id: DrinkId;
    start: number;
    before: Layer[];
    pointer?: number;
  } | null>(null);
  const raf = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const total = totalVolume(layers);
  function update(next: Layer[]) {
    layerRef.current = next;
    setLayers(next);
  }
  function stop(minimum = true) {
    const current = session.current;
    if (!current) return;
    session.current = null;
    sound.stopPour();
    setSettling((value) => value + 1);
    cancelAnimationFrame(raf.current);
    setActive(null);
    const elapsed =
      (Math.max(0, performance.now() - current.start) / 1000) * RATE;
    const next = pour(
      current.before,
      current.id,
      minimum ? Math.max(MIN_POUR, elapsed) : elapsed,
    );
    update(next);
    if (totalVolume(next) > totalVolume(current.before))
      setHistory((old) => [...old, current.before]);
  }
  function start(id: DrinkId, pointer?: number) {
    if (
      session.current ||
      mixing ||
      mixed ||
      totalVolume(layerRef.current) >= CAPACITY
    )
      return;
    session.current = {
      id,
      start: performance.now(),
      before: layerRef.current.map((l) => ({ ...l })),
      pointer,
    };
    setActive(id);
    sound.startPour();
    const tick = () => {
      const current = session.current;
      if (!current) return;
      const next = pour(
        current.before,
        id,
        ((performance.now() - current.start) / 1000) * RATE,
      );
      update(next);
      if (totalVolume(next) >= CAPACITY) {
        stop();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }
  useEffect(() => {
    const cancel = () => stop(false);
    const release = (event: PointerEvent) => {
      if (session.current?.pointer === event.pointerId)
        stop(event.type !== "pointercancel");
    };
    const visibility = () => {
      if (document.hidden) cancel();
    };
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      sound.stopPour();
      cancelAnimationFrame(raf.current);
      clearTimeout(timer.current);
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, []);
  useEffect(() => {
    if (!visible) stop(false);
  }, [visible]);
  function reset() {
    stop(false);
    update([]);
    setHistory([]);
    setMixed(false);
  }
  function mix() {
    if (!total || active || mixing || mixed) return;
    sound.play("mix");
    setMixing(true);
    onMixingChange(true);
    timer.current = setTimeout(
      () => {
        sound.stopAll();
        setMixing(false);
        onMixingChange(false);
        setMixed(true);
        onComplete(layerRef.current.map((layer) => ({ ...layer })));
      },
      reducedMotion || matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 180
        : 1500,
    );
  }
  return (
    <div className="app">
      <header className="topbar">
        <a
          className="brand"
          href="https://ku-inouetakahiro.github.io/kimagure-jiyucho/index.html"
          target="_blank"
          rel="noreferrer"
        >
          <span className="brand-mark">✳</span> きまぐれ自由帳
          <span className="brand-small">の小さなあそび場</span>
        </a>
        <button
          className="help-button"
          onClick={() => setHelp(!help)}
          aria-expanded={help}
        >
          ? <span>あそびかた</span>
        </button>
      </header>
      <main>
        <div className="intro">
          <div className="eyebrow">
            <span /> A LITTLE EXPERIMENT, A HAPPY SIP <span />
          </div>
          <h1>
            まぜまぜ
            <span>
              ドリンクラボ<span className="title-bubbles">°｡</span>
            </span>
          </h1>
          <p>
            好きなものを、好きなだけ。
            <br className="mobile-break" /> 今日はどんな色になる？
          </p>
        </div>
        {help && (
          <aside className="help-panel">
            ① ドリンクを長押しして注ぐ（タップで5ml）
            <br />② いろいろ重ねて、300mlまで自由にブレンド
            <br />
            ③「まぜまぜ！」で、あなただけの色に。
            <br />
            <small>
              キーボードではTabで選び、スペースかEnterを長押し。完成したら名前をつけて、図鑑に登録しよう。
            </small>
          </aside>
        )}
        {guide && (
          <aside className="guide-panel">
            <h2>✎ 再現ガイド</h2>
            <p>
              この順番で、自分の手で注いでみよう。目標と現在量を見比べてね。
            </p>
            <ol>
              {guide.map((layer, index) => (
                <li key={index}>
                  {drinks.find((d) => d.id === layer.drinkId)!.name}{" "}
                  <b>{layer.ml.toFixed(1)} ml</b>
                </li>
              ))}
            </ol>
          </aside>
        )}
        <section className="workspace" aria-label="ドリンク作成">
          <div className="machine">
            <div className="machine-top">
              <span className="screw" />
              <div>
                <span className="machine-logo">DRINK LAB</span>
                <span className="machine-sub">
                  まぜる、みつける、ときめく。
                </span>
              </div>
              <span className="screw" />
            </div>
            <div className="selection">
              <div className="section-label">
                <span className="step">01</span> 好きなドリンクを長押し{" "}
                <span className="hold-label">HOLD TO POUR ↓</span>
              </div>
              <div className="drink-grid">
                {drinks.map((drink, index) => (
                  <button
                    key={drink.id}
                    className={`drink-button ${active === drink.id ? "selected" : ""}`}
                    style={{ "--drink": drink.color } as React.CSSProperties}
                    disabled={mixing || mixed || total >= CAPACITY}
                    aria-label={`${drink.name}を注ぐ`}
                    onContextMenu={(e) => e.preventDefault()}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      e.preventDefault();
                      e.currentTarget.setPointerCapture(e.pointerId);
                      start(drink.id, e.pointerId);
                    }}
                    onPointerMove={(e) => {
                      if (session.current?.pointer !== e.pointerId) return;
                      const r = e.currentTarget.getBoundingClientRect();
                      if (
                        e.clientX < r.left ||
                        e.clientX > r.right ||
                        e.clientY < r.top ||
                        e.clientY > r.bottom
                      )
                        stop(false);
                    }}
                    onLostPointerCapture={() => stop(false)}
                    onKeyDown={(e) => {
                      if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                        e.preventDefault();
                        start(drink.id);
                      }
                    }}
                    onKeyUp={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        stop();
                      }
                    }}
                    onBlur={() => stop(false)}
                  >
                    <span className="drink-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="drink-icon">
                      <span>{drink.icon}</span>
                      <i />
                      <i />
                    </span>
                    <span className="drink-name">{drink.name}</span>
                    <span className="button-light" />
                  </button>
                ))}
              </div>
            </div>
            <div className="dispense">
              <div className="bay-side">
                FRESH
                <br />& FUN<span>✧</span>
              </div>
              <div className="nozzle">
                <i />
                <b />
              </div>
              <Glass
                layers={layers}
                active={active}
                mixing={mixing}
                mixed={mixed}
                settling={settling}
              />
              <div className={`status-light ${active ? "on" : ""}`} />
              <div className="tray" />
            </div>
            <div className="machine-foot">
              <span>HAVE A COLORFUL DAY!</span>
              <span>✦ 300 ml ✦</span>
            </div>
          </div>
          <aside className="mix-panel">
            <div className="section-label">
              <span className="step mint">02</span> あなただけの一杯
            </div>
            <h2>
              {mixed
                ? "できあがり！"
                : mixing
                  ? "まぜまぜ中…"
                  : "ひとさじの、好奇心。"}
            </h2>
            <p className="panel-description">
              {mixed
                ? "偶然うまれた、この色を楽しもう。"
                : "組み合わせは、あなたしだい。\n気になる味を重ねてみよう。"}
            </p>
            <div className="volume-row">
              <span>グラスの中身</span>
              <strong data-testid="volume">
                {Math.round(total)}
                <small> / 300 ml</small>
              </strong>
            </div>
            <VolumeGauge layers={layers} mixing={mixing} mixed={mixed} />
            <div className="ingredients">
              {!layers.length ? (
                <div className="empty-recipe">
                  <span>◌</span>
                  <p>
                    まだ空っぽのグラス。
                    <br />
                    最初のひとしずくをどうぞ。
                  </p>
                </div>
              ) : (
                drinks
                  .filter((d) => layers.some((l) => l.drinkId === d.id))
                  .map((d) => (
                    <div className="ingredient" key={d.id}>
                      <span
                        className="color-dot"
                        style={{ background: d.color }}
                      />
                      <span>{d.name}</span>
                      <b>
                        {Math.round(
                          layers
                            .filter((l) => l.drinkId === d.id)
                            .reduce((s, l) => s + l.ml, 0),
                        )}
                        <small> ml</small>
                      </b>
                    </div>
                  ))
              )}
            </div>
            {mixed && (
              <div className="result-color">
                <span style={{ background: mixColor(layers) }} /> できあがりの色{" "}
                <b>{mixColor(layers)}</b>
              </div>
            )}
            <div className="edit-actions">
              <button
                disabled={!history.length || !!active || mixing || mixed}
                onClick={() => {
                  const previous = history.at(-1);
                  if (previous) {
                    update(previous);
                    setHistory((h) => h.slice(0, -1));
                  }
                }}
              >
                ↶ 1操作戻す
              </button>
              <button disabled={!total || !!active || mixing} onClick={reset}>
                ↻ 全部やり直す
              </button>
            </div>
            <button
              className="mix-button"
              disabled={!total || !!active || mixing}
              onClick={mixed ? reset : mix}
            >
              <span>{mixed ? "＋" : "✧"}</span>{" "}
              {mixed
                ? "もう一杯つくる"
                : mixing
                  ? "おいしい色に、変身中"
                  : "まぜまぜ！"}
              <span>✧</span>
            </button>
            <p className="tiny-note" role="status">
              {active
                ? `${drinks.find((d) => d.id === active)!.name}を注いでいます…`
                : total >= CAPACITY && !mixed
                  ? "グラスがいっぱい！まぜてみよう。"
                  : mixed
                    ? "次はどんな組み合わせにする？"
                    : "長押しで注いで、指を離すとストップ。"}
            </p>
            <div className="lab-note">
              <span>✎ LAB NOTE</span>
              <p>
                ちがう色を重ねると、グラスに小さな虹。
                <br />
                まぜたら、どんな色になるかな？
              </p>
            </div>
          </aside>
        </section>
        <div className="bottom-note">
          <span>✦</span> 正解のない、おいしい実験。<span>✦</span>
        </div>
      </main>
      <footer>
        <span>© きまぐれ自由帳</span>
        <span>MADE WITH A SPLASH OF CURIOSITY</span>
        <span>DRINK LAB · vol. 03</span>
      </footer>
    </div>
  );
}
