import type { Session } from "../types";

const CSV_HEADERS = [
    "session_id",
    "participant_id",
    "stage",
    "audio_mode",
    "target_length",
    "blink_ms",
    "gap_ms",
    "round",
    "position",
    "expected_color",
    "pressed_color",
    "correct",
    "reaction_ms",
    "timestamp",
];

const esc = (v: string | number | boolean) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCSV(sessions: Session[]): string {
    const rows: string[] = [CSV_HEADERS.join(",")];
    for (const s of sessions) {
        for (const st of s.stages) {
            for (const p of st.presses) {
                rows.push(
                    [
                        s.sessionId,
                        s.participantId,
                        st.config.stage,
                        st.config.audioMode,
                        st.config.targetLength,
                        st.config.blinkMs,
                        st.config.gapMs,
                        p.round,
                        p.position,
                        p.expected,
                        p.pressed,
                        p.correct,
                        p.reactionMs,
                        p.timestamp,
                    ]
                        .map(esc)
                        .join(","),
                );
            }
        }
    }
    return rows.join("\n");
}

/** full nested sessions: config, sequences, every press and per stage summary. */
export function toJSON(sessions: Session[]): string {
    return JSON.stringify(sessions, null, 2);
}

export function downloadFile(filename: string, mime: string, content: string) {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
