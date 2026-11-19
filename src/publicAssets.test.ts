import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
const publicFile = (name: string) =>
  new URL(`../public/${name}`, import.meta.url);
describe("公開用アセット", () => {
  it("Manifestは相対URLとテーマ色を持ち、Service Workerを要求しない", () => {
    const manifest = JSON.parse(
      readFileSync(publicFile("manifest.webmanifest"), "utf8"),
    );
    expect(manifest.start_url).toBe("./");
    expect(manifest.scope).toBe("./");
    expect(manifest.theme_color).toBe("#FFF8EA");
    expect(manifest.display).toBe("standalone");
    expect(existsSync(publicFile("sw.js"))).toBe(false);
  });
  for (const [name, width, height] of [
    ["icon-192.png", 192, 192],
    ["icon-512.png", 512, 512],
    ["apple-touch-icon.png", 180, 180],
    ["ogp.png", 1200, 630],
  ] as const)
    it(`${name}の実寸が正しい`, () => {
      const bytes = readFileSync(publicFile(name));
      expect(bytes.subarray(1, 4).toString()).toBe("PNG");
      expect(bytes.readUInt32BE(16)).toBe(width);
      expect(bytes.readUInt32BE(20)).toBe(height);
    });
  it("未取得の独自ドメインのCNAMEを作らない", () => {
    expect(existsSync(publicFile("CNAME"))).toBe(false);
    const html = readFileSync(
      new URL("../index.html", import.meta.url),
      "utf8",
    );
    expect(html).not.toContain("drink.kimagure-jiyucho.com");
    expect(html).toContain("viewport-fit=cover");
    expect(html).toContain("%BASE_URL%manifest.webmanifest");
  });
});
