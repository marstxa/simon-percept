import type { Session } from "../types";

const KEY = "simon-says-sessions-v1";

export function loadSessions(): Session[] {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? (JSON.parse(raw) as Session[]) : [];
    } catch {
        return [];
    }
}

export function saveSession(session: Session) {
    try {
        localStorage.setItem(KEY, JSON.stringify([...loadSessions(), session]));
    } catch {
        /* storage unavailable: the session can still be downloaded from the results screen */
    }
}

export function clearSessions() {
    try {
        localStorage.removeItem(KEY);
    } catch {
        /* ignore */
    }
}
