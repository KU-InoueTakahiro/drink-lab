import { describe, expect, it } from "vitest";
import {
  SHARE_HEIGHT,
  SHARE_WIDTH,
  shareFilename,
  shareName,
  supportsFileShare,
  wrapText,
} from "./shareImage";
describe("共有画像のテキストと対応判定", () => {
  it("縦長1080×1920", () => {
    expect([SHARE_WIDTH, SHARE_HEIGHT]).toEqual([1080, 1920]);
  });
  it("日本語80文字を落とさず改行し、行幅に収める", () => {
    const text = "まぜまぜドリンクラボのとっておき".repeat(5).slice(0, 80),
      lines = wrapText(text, 22, (s) => Array.from(s).length);
    expect(lines.join("")).toBe(text);
    expect(lines.length).toBeLessThanOrEqual(4);
    expect(lines.every((s) => Array.from(s).length <= 22)).toBe(true);
  });
  it("絵文字の結合を壊さない", () => {
    const lines = wrapText("りんご👨‍👩‍👧‍👦🍎ソーダ", 4, (s) => Array.from(s).length);
    expect(lines.join("")).toBe("りんご👨‍👩‍👧‍👦🍎ソーダ");
    expect(lines.some((l) => l.includes("👨‍👩‍👧‍👦"))).toBe(true);
  });
  it("空名・改行・ファイル名の禁則文字を扱う", () => {
    expect(shareName("  ")).toBe("無名のドリンク");
    expect(shareName("空\nの\t水")).toBe("空 の 水");
    expect(shareFilename("../あ/いう:茶")).not.toMatch(/[\\/:*?"<>|]/);
    expect(shareFilename("水")).toBe("drink-lab-水.png");
  });
  it("canShareが未対応・拒否・例外なら保存案内へ切り替える", () => {
    const file = new File(["image"], "drink.png", { type: "image/png" });
    expect(supportsFileShare(file, {} as Navigator)).toBe(false);
    expect(
      supportsFileShare(file, { share: async () => {}, canShare: () => false }),
    ).toBe(false);
    expect(
      supportsFileShare(file, {
        share: async () => {},
        canShare: () => {
          throw new Error();
        },
      }),
    ).toBe(false);
    expect(
      supportsFileShare(file, {
        share: async () => {},
        canShare: (data) => data?.files?.[0] === file,
      }),
    ).toBe(true);
  });
});
