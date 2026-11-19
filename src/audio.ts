import type { Settings } from "./saveData";
export type Sound = "button" | "mix" | "complete" | "discovery" | "register";
export type AudioStatus = "idle" | "ready" | "blocked" | "unavailable";
type Factory = () => AudioContext;
/** Original synthesized sounds. No recordings or third-party audio assets. */
export class SoundEngine {
  private context?: AudioContext;
  private master?: GainNode;
  private sources = new Set<OscillatorNode>();
  private pourSources = new Set<OscillatorNode>();
  private pourTimer?: ReturnType<typeof setInterval>;
  private settings = { soundEnabled: true, soundVolume: 0.45 };
  private listeners = new Set<(status: AudioStatus) => void>();
  private status: AudioStatus = "idle";
  private foreground = true;
  setForeground(active: boolean) {
    this.foreground = active;
    if (!active) this.stopAll();
  }
  constructor(
    private factory: Factory = () => {
      const Constructor =
        globalThis.AudioContext ||
        (
          globalThis as typeof globalThis & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;
      if (!Constructor) throw new Error("Audio is unavailable");
      return new Constructor();
    },
  ) {}
  subscribe(listener: (status: AudioStatus) => void) {
    this.listeners.add(listener);
    listener(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private notify(status: AudioStatus) {
    if (status === this.status) return;
    this.status = status;
    this.listeners.forEach((listener) => listener(status));
  }
  configure(settings: Pick<Settings, "soundEnabled" | "soundVolume">) {
    this.settings = settings;
    try {
      this.master?.gain.setTargetAtTime(
        settings.soundEnabled ? settings.soundVolume * 0.22 : 0,
        this.context!.currentTime,
        0.015,
      );
    } catch {
      /* Muting must never interrupt the game. */
    }
    if (!settings.soundEnabled || settings.soundVolume === 0) this.stopAll();
  }
  /** Called synchronously from a trusted pointer/key event, never during loading. */
  unlock() {
    if (!this.settings.soundEnabled || this.settings.soundVolume === 0) return;
    try {
      if (!this.context) {
        this.context = this.factory();
        this.master = this.context.createGain();
        this.master.gain.value = this.settings.soundVolume * 0.22;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === "suspended")
        void this.context
          .resume()
          .then(() =>
            this.notify(
              this.context?.state === "running" ? "ready" : "blocked",
            ),
          )
          .catch(() => this.notify("blocked"));
      else this.notify(this.context.state === "running" ? "ready" : "blocked");
    } catch {
      this.notify("unavailable");
    }
  }
  private tone(
    frequency: number,
    duration: number,
    offset = 0,
    type: OscillatorType = "sine",
    endFrequency?: number,
  ) {
    if (
      !this.foreground ||
      !this.settings.soundEnabled ||
      !this.settings.soundVolume ||
      this.context?.state !== "running" ||
      !this.master
    )
      return;
    try {
      const ctx = this.context,
        oscillator = ctx.createOscillator(),
        gain = ctx.createGain(),
        start = ctx.currentTime + offset;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      if (endFrequency)
        oscillator.frequency.exponentialRampToValueAtTime(
          endFrequency,
          start + duration,
        );
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(
        0.35,
        start + Math.min(0.015, duration / 4),
      );
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      oscillator.connect(gain);
      gain.connect(this.master);
      this.sources.add(oscillator);
      oscillator.onended = () => {
        this.sources.delete(oscillator);
        this.pourSources.delete(oscillator);
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(start);
      oscillator.stop(start + duration + 0.01);
      return oscillator;
    } catch {
      this.notify("blocked");
    }
  }
  play(sound: Sound) {
    switch (sound) {
      case "button":
        this.tone(680, 0.075, 0, "sine", 1050);
        break;
      case "mix":
        [0, 0.16, 0.32, 0.48, 0.64, 0.8, 0.96, 1.12].forEach((offset, i) =>
          this.tone(160 + (i % 3) * 60, 0.18, offset, "triangle", 100),
        );
        break;
      case "complete":
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
          this.tone(f, 0.22, i * 0.1),
        );
        break;
      case "discovery":
        [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) =>
          this.tone(f, 0.3, i * 0.115, "triangle"),
        );
        break;
      case "register":
        this.tone(783.99, 0.12);
        this.tone(1174.66, 0.2, 0.1);
        break;
    }
  }
  startPour() {
    this.stopPour();
    if (
      !this.foreground ||
      !this.settings.soundEnabled ||
      !this.settings.soundVolume ||
      !this.context
    )
      return;
    let step = 0;
    const glug = () => {
      const source = this.tone(280 + (step++ % 3) * 35, 0.11, 0, "sine", 100);
      if (source) this.pourSources.add(source);
    };
    glug();
    this.pourTimer = setInterval(glug, 145);
  }
  stopPour() {
    if (this.pourTimer !== undefined) clearInterval(this.pourTimer);
    this.pourTimer = undefined;
    for (const source of this.pourSources) {
      try {
        source.stop();
      } catch {
        /* Already ended. */
      }
    }
    this.pourSources.clear();
  }
  stopAll() {
    this.stopPour();
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        /* Already ended. */
      }
    }
    this.sources.clear();
  }
}
export const sound = new SoundEngine();
