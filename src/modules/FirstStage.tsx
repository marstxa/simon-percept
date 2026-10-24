import { useCallback, useEffect, useRef, useState } from "react";

export type ColorId = "red" | "green" | "yellow" | "blue";

/** match    = audio says the color that blinks (Level 1)
 *  none     = beeps only (Level 2)
 *  mismatch = audio says a DIFFERENT color than the one that blinks (Level 3) */
export type AudioMode = "match" | "none" | "mismatch";

export interface StageConfig {
    level: 1 | 2 | 3;
    stage: 1 | 2 | 3 | 4 | 5;
    audioMode: AudioMode;
    /** Sequence length the player must reach to pass the stage */
    targetLength: number;
    /** How long each colour stays lit (ms) */
    blinkMs: number;
    /** Pause between colours (ms) */
    gapMs: number;
}

export interface PressRecord {
    round: number; // sequence length at the time of press
    position: number; // index inside sequence
    expected: ColorId;
    pressed: ColorId;
    correct: boolean;
    reactionMs: number; // time since the previous press
}

export interface StageResult {
    level: number;
    stage: number;
    passed: boolean;
    targetLength: number;
    reachedLength: number;
    presses: PressRecord[];
    meanReactionMs: number | null;
}

/* -------------------------------------------------------------------------- */
/*  Config + colour table                                                      */
/* -------------------------------------------------------------------------- */

export const STAGE1: StageConfig = {
    level: 1,
    stage: 1,
    audioMode: "match",
    targetLength: 3,
    blinkMs: 800,
    gapMs: 400,
};

const COLORS: ColorId[] = ["red", "green", "yellow", "blue"];

// Full class names must be written out so Tailwind can see them.
const COLOR_STYLES: Record<ColorId, { base: string; label: string; freq: number }> = {
    red: { base: "bg-error", label: "Red", freq: 261.63 },
    green: { base: "bg-success", label: "Green", freq: 329.63 },
    yellow: { base: "bg-warning", label: "Yellow", freq: 392.0 },
    blue: { base: "bg-info", label: "Blue", freq: 523.25 },
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const randomColor = (): ColorId => COLORS[Math.floor(Math.random() * COLORS.length)];

/** Decides which word (if any) the voice says for a colour that is blinking. */
export function getSpokenWord(color: ColorId, mode: AudioMode): ColorId | null {
    if (mode === "none") return null;
    if (mode === "match") return color;
    const others = COLORS.filter(c => c !== color);
    return others[Math.floor(Math.random() * others.length)];
}

function useSimonAudio() {
    const ctxRef = useRef<AudioContext | null>(null);

    // must be called from a use gesture so browsers allow audio
    const unlock = useCallback(() => {
        if (!ctxRef.current) {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            ctxRef.current = new Ctx();
        }
        if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    }, []);

    const beep = useCallback((color: ColorId, ms = 350) => {
        const ctx = ctxRef.current;
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
    }, []);

    const stopAll = useCallback(() => {
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    }, []);

    const speak = useCallback((word: string) => {
        if (!("speechSynthesis" in window)) return;

        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(word);
        u.lang = "en-US";
        u.rate = 1;
        u.pitch = 1;
        window.speechSynthesis.speak(u);
    }, []);

    return { unlock, beep, speak, stopAll };
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

type Phase = "intro" | "showing" | "input" | "passed" | "failed";

interface Props {
    config?: StageConfig;
    onComplete?: (result: StageResult) => void;
}

export default function FirstStage({ config = STAGE1, onComplete }: Props) {
    const { unlock, beep, speak, stopAll } = useSimonAudio();

    const [phase, setPhase] = useState<Phase>("intro");
    const [lit, setLit] = useState<ColorId | null>(null);
    const [round, setRound] = useState(0); // current sequence length
    const [inputIndex, setInputIndex] = useState(0);
    const [result, setResult] = useState<StageResult | null>(null);

    const sequenceRef = useRef<ColorId[]>([]);
    const pressesRef = useRef<PressRecord[]>([]);
    const lastTimeRef = useRef(0);
    const cancelledRef = useRef(false);

    useEffect(() => {
        cancelledRef.current = false;
        return () => {
            cancelledRef.current = true;
            stopAll();
        };
    }, [stopAll]);

    const finish = useCallback(
        (passed: boolean) => {
            const presses = pressesRef.current;
            const correctPresses = presses.filter(p => p.correct);
            const mean = correctPresses.length
                ? Math.round(correctPresses.reduce((s, p) => s + p.reactionMs, 0) / correctPresses.length)
                : null;
            const res: StageResult = {
                level: config.level,
                stage: config.stage,
                passed,
                targetLength: config.targetLength,
                reachedLength: passed ? config.targetLength : Math.max(sequenceRef.current.length - 1, 0),
                presses,
                meanReactionMs: mean,
            };
            setResult(res);
            setPhase(passed ? "passed" : "failed");
            onComplete?.(res);
        },
        [config, onComplete],
    );

    const playSequence = useCallback(
        async (seq: ColorId[]) => {
            setPhase("showing");
            setInputIndex(0);
            for (const color of seq) {
                await sleep(config.gapMs);
                if (cancelledRef.current) return;

                setLit(color);
                beep(color, config.blinkMs * 0.6);
                const word = getSpokenWord(color, config.audioMode);
                if (word) speak(word);

                await sleep(config.blinkMs);
                if (cancelledRef.current) return;
                setLit(null);
            }
            await sleep(config.gapMs);
            if (cancelledRef.current) return;
            lastTimeRef.current = performance.now();
            setPhase("input");
        },
        [config, beep, speak],
    );

    const nextRound = useCallback(() => {
        sequenceRef.current = [...sequenceRef.current, randomColor()];
        setRound(sequenceRef.current.length);
        playSequence(sequenceRef.current);
    }, [playSequence]);

    const startStage = () => {
        unlock();
        sequenceRef.current = [];
        pressesRef.current = [];
        setResult(null);
        nextRound();
    };

    const handlePress = async (color: ColorId) => {
        if (phase !== "input") return;

        const now = performance.now();
        const position = inputIndex;
        const expected = sequenceRef.current[position];
        const correct = color === expected;

        pressesRef.current.push({
            round: sequenceRef.current.length,
            position,
            expected,
            pressed: color,
            correct,
            reactionMs: Math.round(now - lastTimeRef.current),
        });
        lastTimeRef.current = now;

        // brief press feedback
        setLit(color);
        beep(color, 200);
        setTimeout(() => setLit(null), 180);

        if (!correct) {
            finish(false);
            return;
        }

        const nextIndex = position + 1;
        setInputIndex(nextIndex);

        if (nextIndex === sequenceRef.current.length) {
            if (sequenceRef.current.length >= config.targetLength) {
                finish(true);
            } else {
                setPhase("showing"); // lock the pads while we wait
                await sleep(800);
                if (!cancelledRef.current) nextRound();
            }
        }
    };

    const statusText: Record<Phase, string> = {
        intro: "Watch the colours and listen to the voice. Then repeat the sequence.",
        showing: "Watch and listen",
        input: "Your turn",
        passed: "Stage complete",
        failed: "Wrong colour",
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
            <div className="card w-full max-w-md bg-base-100 shadow-xl">
                <div className="card-body items-center gap-5">
                    <div className="text-center">
                        <h1 className="card-title justify-center text-2xl">
                            Level {config.level} · Stage {config.stage}
                        </h1>
                        <p className="text-sm opacity-70 mt-1" aria-live="polite">
                            {statusText[phase]}
                        </p>
                    </div>

                    {/* Progress */}
                    <progress
                        className="progress progress-primary w-48"
                        value={
                            phase === "intro"
                                ? 0
                                : phase === "passed"
                                  ? config.targetLength
                                  : round - (phase === "failed" ? 1 : 0)
                        }
                        max={config.targetLength}
                        aria-label="Stage progress"
                    />

                    {/* Pads */}
                    <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                        {COLORS.map(color => {
                            const isLit = lit === color;
                            return (
                                <button
                                    key={color}
                                    type="button"
                                    aria-label={COLOR_STYLES[color].label}
                                    onClick={() => handlePress(color)}
                                    disabled={phase === "intro"}
                                    className={[
                                        "aspect-square rounded-2xl border-0 transition-all duration-100",
                                        COLOR_STYLES[color].base,
                                        isLit ? "opacity-100 scale-105 ring-4 ring-base-content/40" : "opacity-40",
                                        phase === "input"
                                            ? "cursor-pointer hover:opacity-60 active:scale-95"
                                            : "cursor-default",
                                    ].join(" ")}
                                />
                            );
                        })}
                    </div>

                    {/* Actions */}
                    {phase === "intro" && (
                        <div className="card-actions">
                            <button className="btn btn-primary" onClick={startStage}>
                                Start
                            </button>
                        </div>
                    )}

                    {(phase === "passed" || phase === "failed") && result && (
                        <div className="w-full text-center space-y-3">
                            <div className="stats stats-vertical sm:stats-horizontal shadow w-full">
                                <div className="stat py-2">
                                    <div className="stat-title">Reached</div>
                                    <div className="stat-value text-2xl">
                                        {result.reachedLength}/{result.targetLength}
                                    </div>
                                </div>
                                <div className="stat py-2">
                                    <div className="stat-title">Avg. reaction</div>
                                    <div className="stat-value text-2xl">
                                        {result.meanReactionMs !== null ? `${result.meanReactionMs} ms` : "–"}
                                    </div>
                                </div>
                            </div>
                            <button className="btn btn-outline btn-sm" onClick={startStage}>
                                Try again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
