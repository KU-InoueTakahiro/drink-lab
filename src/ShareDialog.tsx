import { useEffect, useRef, useState } from "react";
import {
  generateShareImage,
  shareFilename,
  shareName,
  supportsFileShare,
  type ShareDrink,
  type ShareTemplate,
} from "./shareImage";
export function ShareDialog({
  drink,
  onClose,
}: {
  drink: ShareDrink;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [template, setTemplate] = useState<ShareTemplate>("pop");
  const [image, setImage] = useState<{ url: string; file: File } | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => {
      document.body.style.overflow = oldOverflow;
      previous?.focus();
    };
  }, []);
  useEffect(() => {
    let cancelled = false,
      url: string | undefined;
    setGenerating(true);
    setImage(null);
    setError("");
    setMessage("");
    void generateShareImage(drink, template)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setImage({
          url,
          file: new File([blob], shareFilename(drink.name), {
            type: "image/png",
          }),
        });
      })
      .catch((error) => {
        if (!cancelled)
          setError(
            error instanceof Error
              ? error.message
              : "画像を生成できませんでした。",
          );
      })
      .finally(() => {
        if (!cancelled) setGenerating(false);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [drink, template, retry]);
  const canShare = image ? supportsFileShare(image.file) : false;
  function save() {
    if (!image) return;
    const a = document.createElement("a");
    a.href = image.url;
    a.download = image.file.name;
    a.click();
    setMessage(
      "PNG画像の保存を開始しました。端末によっては、ダウンロード一覧から開けます。",
    );
  }
  async function share() {
    if (!image || !canShare) return;
    setError("");
    setSharing(true);
    try {
      await navigator.share({
        files: [image.file],
        title: shareName(drink.name),
        text: "まぜまぜドリンクラボでつくった、わたしだけの一杯。 #まぜまぜドリンクラボ",
      });
      setMessage("共有メニューを開きました。");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError")
        setMessage("共有をキャンセルしました。画像の保存もできます。");
      else
        setError(
          "共有メニューを開けませんでした。「PNG画像を保存」をお使いください。",
        );
    } finally {
      setSharing(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="share-dialog"
      aria-labelledby="share-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!sharing) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !sharing) onClose();
      }}
    >
      <div className="share-inner">
        <header>
          <div>
            <span className="eyebrow">SHARE YOUR LITTLE DISCOVERY</span>
            <h2 id="share-title">とっておきの一杯をシェア</h2>
          </div>
          <button
            className="icon-button"
            aria-label="共有画面を閉じる"
            disabled={sharing}
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div
          className="template-switch"
          role="group"
          aria-label="画像テンプレート"
        >
          <button
            aria-pressed={template === "pop"}
            disabled={sharing}
            onClick={() => setTemplate("pop")}
          >
            ✦ ポップ
          </button>
          <button
            aria-pressed={template === "simple"}
            disabled={sharing}
            onClick={() => setTemplate("simple")}
          >
            ◌ シンプル
          </button>
        </div>
        <div className="share-layout">
          <div className="share-preview" aria-busy={generating}>
            {generating ? (
              <p role="status">とっておきの画像をつくっています…</p>
            ) : image ? (
              <img
                src={image.url}
                width="1080"
                height="1920"
                alt={`${shareName(drink.name)}の共有画像：${template === "pop" ? "ポップ" : "シンプル"}`}
              />
            ) : (
              <p>画像を表示できませんでした。</p>
            )}
          </div>
          <div className="share-controls">
            <span className="pill">1080 × 1920 px · PNG</span>
            <h3>色も、レシピも、ひとつに。</h3>
            <p>
              ストーリーにもぴったりな縦長サイズ。好きなテンプレートを選んでね。
            </p>
            {error && (
              <div className="error-notice" role="alert">
                {error}
                {!image && (
                  <button onClick={() => setRetry((r) => r + 1)}>
                    画像生成を再試行
                  </button>
                )}
              </div>
            )}
            {message && (
              <p className="share-status" role="status">
                {message}
              </p>
            )}
            <button
              className="mix-button"
              disabled={!image || generating || sharing}
              onClick={save}
            >
              ↓ PNG画像を保存
            </button>
            {canShare ? (
              <button
                className="soft-button"
                disabled={sharing || generating}
                onClick={() => void share()}
              >
                {sharing
                  ? "共有メニューを開いています…"
                  : "↑ 端末の共有メニューを開く"}
              </button>
            ) : (
              image && (
                <p className="field-note">
                  この環境では画像の共有メニューを利用できません。PNGを保存して、お好きなSNSに添付してください。
                </p>
              )
            )}
            <p className="field-note">
              投稿前に、ドリンク名と配合をプレビューで確認してください。SNSへの投稿は自動では行いません。
            </p>
          </div>
        </div>
      </div>
    </dialog>
  );
}
