import { useCallback, useEffect, useRef, useState } from "react";
import { COLORS, COLOR_STYLES, STAGES } from "../config";
import { beep } from "../lib/audio";
import type { ColorId, PressRecord, StageConfig, StageResult } from "../types";

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const randomColor = (): ColorId => COLORS[Math.floor(Math.random() * COLORS.length)];

type Phase = "waiting" | "showing" | "input" | "done";

interface Props {
    config: StageConfig;
    onComplete: (result: StageResult) => void;
}

export default function SimonStage({ config, onComplete }: Props) {
    const [phase, setPhase] = useState<Phase>("waiting");
    const [lit, setLit] = useState<ColorId | null>(null);
    const [litWrong, setLitWrong] = useState(false);
    const [round, setRound] = useState(0);

    const sequenceRef = useRef<ColorId[]>([]);
    const pressesRef = useRef<PressRecord[]>([]);
    const positionRef = useRef(0);
    const lockedRef = useRef(true); // true = pads ignore clicks
    const lastTimeRef = useRef(0);
    const startedAtRef = useRef("");
    const cancelledRef = useRef(false);
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;

    const sound = (color: ColorId, ms: number) => {
        if (config.audioMode === "beep") beep(color, ms);
    };

    const finish = useCallback(() => {
        const presses = pressesRef.current;
        const correct = presses.filter(p => p.correct);
        const result: StageResult = {
            config,
            sequence: sequenceRef.current,
            presses,
            totalPresses: presses.length,
            correctPresses: correct.length,
            accuracy: presses.length ? correct.length / presses.length : 0,
            meanReactionMs: correct.length
                ? Math.round(correct.reduce((s, p) => s + p.reactionMs, 0) / correct.length)
                : null,
            startedAt: startedAtRef.current,
            finishedAt: new Date().toISOString(),
        };
        setPhase("done");
        onCompleteRef.current(result);
    }, [config]);

    const playSequence = useCallback(async () => {
        lockedRef.current = true;
        setPhase("showing");
        for (const color of sequenceRef.current) {
            await sleep(config.gapMs);
            if (cancelledRef.current) return;
            setLit(color);
            if (config.audioMode === "beep") beep(color, config.blinkMs * 0.6);
            await sleep(config.blinkMs);
            if (cancelledRef.current) return;
            setLit(null);
        }
        await sleep(config.gapMs);
        if (cancelledRef.current) return;
        positionRef.current = 0;
        lastTimeRef.current = performance.now();
        lockedRef.current = false;
        setPhase("input");
    }, [config]);

    const nextRound = useCallback(() => {
        sequenceRef.current = [...sequenceRef.current, randomColor()];
        setRound(sequenceRef.current.length);
        playSequence();
    }, [playSequence]);

    // Auto-start shortly after the stage mounts.
    useEffect(() => {
        cancelledRef.current = false;
        startedAtRef.current = new Date().toISOString();
        const t = setTimeout(nextRound, 900);
        return () => {
            cancelledRef.current = true;
            clearTimeout(t);
        };
    }, [nextRound]);

    const handlePress = async (color: ColorId) => {
        if (lockedRef.current) return;

        const now = performance.now();
        const position = positionRef.current;
        const expected = sequenceRef.current[position];
        const correct = color === expected;

        pressesRef.current.push({
            round: sequenceRef.current.length,
            position,
            expected,
            pressed: color,
            correct,
            reactionMs: Math.round(now - lastTimeRef.current),
            timestamp: new Date().toISOString(),
        });
        lastTimeRef.current = now;

        setLit(color);
        setLitWrong(!correct);
        sound(color, 200);
        setTimeout(() => {
            setLit(null);
            setLitWrong(false);
        }, 180);

        // A wrong press is recorded, but the round keeps going until the sequence is complete.
        positionRef.current = position + 1;
        if (positionRef.current < sequenceRef.current.length) return;

        lockedRef.current = true;
        setPhase("showing");
        if (sequenceRef.current.length >= config.targetLength) {
            await sleep(600);
            if (!cancelledRef.current) finish();
        } else {
            await sleep(900);
            if (!cancelledRef.current) nextRound();
        }
    };

    const status =
        phase === "waiting" ? "Get ready" : phase === "showing" ? "Watch" : phase === "input" ? "Your turn" : "Done";

    return (
        <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
            <div className="card w-full max-w-md bg-base-100 shadow-xl">
                <div className="card-body items-center gap-5">
                    <div className="text-center">
                        <h1 className="card-title justify-center text-2xl">
                            Stage {config.stage} of {STAGES.length}
                        </h1>
                        <p className="text-sm opacity-70 mt-1" aria-live="polite">
                            {status}
                        </p>
                    </div>

                    <progress className="progress progress-primary w-48" value={round} max={config.targetLength} />

                    <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                        {COLORS.map(color => {
                            const isLit = lit === color;
                            return (
                                <button
                                    key={color}
                                    type="button"
                                    aria-label={COLOR_STYLES[color].label}
                                    onClick={() => handlePress(color)}
                                    className={[
                                        "aspect-square rounded-2xl border-0 transition-all duration-100",
                                        COLOR_STYLES[color].bg,
                                        isLit ? "opacity-100 scale-105 ring-4" : "opacity-40",
                                        isLit && litWrong ? "ring-base-content" : "ring-base-content/40",
                                        phase === "input"
                                            ? "cursor-pointer hover:opacity-60 active:scale-95"
                                            : "cursor-default",
                                    ].join(" ")}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
