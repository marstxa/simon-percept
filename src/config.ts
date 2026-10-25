import type { AudioMode, ColorId, StageConfig } from "./types";

export const COLORS: ColorId[] = ["red", "green", "yellow", "blue"];

// Full class names so Tailwind can detect them.
export const COLOR_STYLES: Record<ColorId, { bg: string; label: string; freq: number }> = {
    red: { bg: "bg-error", label: "Red", freq: 261.63 },
    green: { bg: "bg-success", label: "Green", freq: 329.63 },
    yellow: { bg: "bg-warning", label: "Yellow", freq: 392.0 },
    blue: { bg: "bg-info", label: "Blue", freq: 523.25 },
};

const DIFFICULTY = { targetLength: 8, blinkMs: 450, gapMs: 200 };

export const STAGES: StageConfig[] = [
    { stage: 1, audioMode: "beep", ...DIFFICULTY },
    { stage: 2, audioMode: "mute", ...DIFFICULTY },
];

export const AUDIO_LABEL: Record<AudioMode, string> = { beep: "Beeps", mute: "Muted" };

export const STAGE_INFO: Record<AudioMode, { title: string; text: string }> = {
    beep: {
        title: "Stage 1: Colour with beeps",
        text: "Each colour lights up with its own beep. Repeat the sequence by pressing the colours in the same order. The sequence grows by one colour each round.",
    },
    mute: {
        title: "Stage 2: Colours without sound",
        text: "This time everything is silent. Watch the colours carefully and repeat the sequence in the same order. The sequence grows by one colour each round.",
    },
};
