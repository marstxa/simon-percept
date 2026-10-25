import { COLOR_STYLES } from "../config";
import type { ColorId } from "../types";

let ctx: AudioContext | null = null;

/** call from a click handler so browsers allow sound. safe to call repeatedly. */
export function unlockAudio() {
    if (!ctx) {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        ctx = new Ctx();
    }
    if (ctx.state === "suspended") ctx.resume();
}

export function beep(color: ColorId, ms = 350) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = COLOR_STYLES[color].freq;
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + ms / 1000 + 0.05);
}
