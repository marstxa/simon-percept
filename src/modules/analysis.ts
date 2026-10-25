import { STAGES } from "../config";
import type { AudioMode, PressRecord, Session } from "../types";

export const CONDITIONS: AudioMode[] = ["beep", "mute"];

const MAX_LEN = Math.max(...STAGES.map(s => s.targetLength));
const round1 = (n: number) => Math.round(n * 10) / 10;
const mean = (xs: number[]) => (xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const pct = (ps: PressRecord[]) => (ps.length ? round1((ps.filter(p => p.correct).length / ps.length) * 100) : null);

export interface ConditionStats {
    presses: number;
    accuracy: number | null; // %
    meanRT: number | null; // ms, correct presses only
    accuracyByRound: (number | null)[]; // index 0 = sequence length 1
    rtByPosition: (number | null)[]; // index 0 = first colour of the sequence
}

export function analyse(sessions: Session[]): Record<AudioMode, ConditionStats> {
    const out = {} as Record<AudioMode, ConditionStats>;
    for (const mode of CONDITIONS) {
        const presses = sessions.flatMap(s =>
            s.stages.filter(st => st.config.audioMode === mode).flatMap(st => st.presses),
        );
        const correct = presses.filter(p => p.correct);
        out[mode] = {
            presses: presses.length,
            accuracy: pct(presses),
            meanRT: mean(correct.map(p => p.reactionMs)),
            accuracyByRound: Array.from({ length: MAX_LEN }, (_, i) => pct(presses.filter(p => p.round === i + 1))),
            rtByPosition: Array.from({ length: MAX_LEN }, (_, i) =>
                mean(correct.filter(p => p.position === i).map(p => p.reactionMs)),
            ),
        };
    }
    return out;
}

export const MAX_SEQUENCE_LENGTH = MAX_LEN;
