import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { VolumeGauge } from "./VolumeGauge";
import { Glass } from "./Glass";
import { mixColor } from "./engine";
import type { Layer } from "./drinks";
const layers: Layer[] = [
  { drinkId: "cola", ml: 50 },
  { drinkId: "water", ml: 100 },
  { drinkId: "cola", ml: 50 },
];
describe("混合前の色を隠す容量ゲージ", () => {
  it("材料を集約せず注入順・量で並べ、完成色を出力しない", () => {
    const html = renderToStaticMarkup(
      <VolumeGauge layers={layers} mixing={false} mixed={false} />,
    );
    expect(
      [...html.matchAll(/data-drink-id="(.*?)"/g)].map((m) => m[1]),
    ).toEqual(["cola", "water", "cola"]);
    expect(html).toContain("width:25%;background-color:#713D37");
    expect(html).toContain("width:50%;background-color:#B9E2EC");
    expect(html).not.toContain(mixColor(layers));
    expect(html).not.toContain("volume-blend");
    expect(html).toContain('aria-valuenow="200"');
  });
  it("混合開始後・完成後にだけゲージとグラスの混合色を生成する", () => {
    const before = renderToStaticMarkup(
      <Glass layers={layers} active={null} mixing={false} mixed={false} />,
    );
    expect(before).not.toContain('class="blended');
    expect(before).not.toContain(mixColor(layers));
    for (const state of [
      { mixing: true, mixed: false },
      { mixing: false, mixed: true },
    ]) {
      expect(
        renderToStaticMarkup(<VolumeGauge layers={layers} {...state} />),
      ).toContain(mixColor(layers));
      expect(
        renderToStaticMarkup(
          <Glass layers={layers} active={null} {...state} />,
        ),
      ).toContain('class="blended');
    }
  });
  it("空のグラスは0mlで、完成色も不正な幅も表示しない", () => {
    const html = renderToStaticMarkup(
      <VolumeGauge layers={[]} mixing={false} mixed={false} />,
    );
    expect(html).toContain('aria-valuenow="0"');
    expect(html).not.toContain("volume-segment");
    expect(html).not.toContain("volume-blend");
    expect(html).not.toContain("NaN");
  });
});
