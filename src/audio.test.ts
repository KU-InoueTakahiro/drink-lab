import { afterEach, describe, expect, it, vi } from "vitest";
import { SoundEngine, type Sound } from "./audio";
function mockContext() {
  const gain = {
    gain: {
      value: 0,
      setTargetAtTime: vi.fn(),
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  const oscillators: { stop: ReturnType<typeof vi.fn> }[] = [];
  const context = {
    state: "running",
    currentTime: 0,
    destination: {},
    createGain: vi.fn(() => gain),
    resume: vi.fn(async () => {}),
    createOscillator: vi.fn(() => {
      const node = {
        type: "sine",
        frequency: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      };
      oscillators.push(node);
      return node;
    }),
  };
  return { context, gain, oscillators };
}
afterEach(() => vi.useRealTimers());
describe("Web Audioによる独自効果音", () => {
  it("最初の操作までAudioContextを作らない", () => {
    const factory = vi.fn(
        () => mockContext().context as unknown as AudioContext,
      ),
      engine = new SoundEngine(factory);
    engine.play("button");
    engine.startPour();
    expect(factory).not.toHaveBeenCalled();
    engine.unlock();
    expect(factory).toHaveBeenCalledTimes(1);
    engine.unlock();
    expect(factory).toHaveBeenCalledTimes(1);
  });
  it("注入音のタイマーを重複させず、停止と消音で解除する", () => {
    vi.useFakeTimers();
    const { context, oscillators } = mockContext(),
      engine = new SoundEngine(() => context as unknown as AudioContext);
    engine.unlock();
    engine.startPour();
    engine.startPour();
    expect(oscillators[0].stop).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(500);
    expect(context.createOscillator.mock.calls.length).toBeGreaterThan(2);
    engine.stopPour();
    expect(vi.getTimerCount()).toBe(0);
    const count = context.createOscillator.mock.calls.length;
    vi.advanceTimersByTime(500);
    expect(context.createOscillator).toHaveBeenCalledTimes(count);
    engine.startPour();
    engine.configure({ soundEnabled: false, soundVolume: 0.5 });
    expect(vi.getTimerCount()).toBe(0);
    engine.play("complete");
    expect(context.createOscillator.mock.calls.length).toBe(count + 1);
  });
  it("音量をマスターへ反映し、0またはOFFの時は再生しない", () => {
    const { context, gain } = mockContext(),
      engine = new SoundEngine(() => context as unknown as AudioContext);
    engine.unlock();
    engine.configure({ soundEnabled: true, soundVolume: 0.25 });
    expect(gain.gain.setTargetAtTime).toHaveBeenCalledWith(
      0.25 * 0.22,
      0,
      0.015,
    );
    engine.configure({ soundEnabled: true, soundVolume: 0 });
    engine.play("button");
    expect(context.createOscillator).not.toHaveBeenCalled();
  });
  it("自動再生拒否・未対応環境で例外を外へ出さない", async () => {
    const { context } = mockContext();
    context.state = "suspended";
    context.resume.mockRejectedValue(new Error("NotAllowed"));
    const states: string[] = [],
      engine = new SoundEngine(() => context as unknown as AudioContext);
    engine.subscribe((status) => states.push(status));
    engine.unlock();
    await Promise.resolve();
    await Promise.resolve();
    expect(states).toContain("blocked");
    const unsupported = new SoundEngine(() => {
      throw new Error("unsupported");
    });
    const listener = vi.fn();
    unsupported.subscribe(listener);
    expect(() => unsupported.unlock()).not.toThrow();
    unsupported.play("complete");
    expect(listener).toHaveBeenCalledWith("unavailable");
  });
  it("6種類を生成でき、非アクティブ化で予定音も止める", () => {
    const { context, oscillators } = mockContext(),
      engine = new SoundEngine(() => context as unknown as AudioContext);
    engine.unlock();
    for (const kind of [
      "button",
      "mix",
      "complete",
      "discovery",
      "register",
    ] as Sound[])
      engine.play(kind);
    expect(context.createOscillator.mock.calls.length).toBeGreaterThan(15);
    const count = context.createOscillator.mock.calls.length;
    engine.setForeground(false);
    engine.play("button");
    expect(context.createOscillator).toHaveBeenCalledTimes(count);
    expect(oscillators.every((node) => node.stop.mock.calls.length >= 2)).toBe(
      true,
    );
  });
});
