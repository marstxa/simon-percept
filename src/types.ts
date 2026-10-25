export type ColorId = "red" | "green" | "yellow" | "blue";

/** beep = every color plays its own tone; mute = no sound at all */
export type AudioMode = "beep" | "mute";

export interface StageConfig {
    stage: 1 | 2;
    audioMode: AudioMode;
    targetLength: number;
    blinkMs: number;
    gapMs: number;
}

export interface PressRecord {
    round: number; // sequence length during this round
    position: number; // 0-based index inside the sequence
    expected: ColorId;
    pressed: ColorId;
    correct: boolean;
    reactionMs: number;
    timestamp: string; // ISO
}

export interface StageResult {
    config: StageConfig;
    sequence: ColorId[]; // final sequence; earlier rounds are prefixes of it
    presses: PressRecord[];
    totalPresses: number;
    correctPresses: number;
    accuracy: number; // 0..1
    meanReactionMs: number | null; // mean over correct presses
    startedAt: string;
    finishedAt: string;
}

export interface Session {
    sessionId: string;
    participantId: string;
    startedAt: string;
    finishedAt: string;
    userAgent: string;
    stages: StageResult[];
}
