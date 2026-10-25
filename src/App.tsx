import { useRef, useState, type ReactNode } from "react";
import { AUDIO_LABEL, STAGES, STAGE_INFO } from "./config";
import { unlockAudio } from "./lib/audio";
import { downloadFile, toCSV, toJSON } from "./lib/exportData";
import DataPanel from "./modules/DataPanel";
import SimonStage from "./modules/SimonSays";
import { clearSessions, loadSessions, saveSession } from "./modules/storage";
import type { Session, StageResult } from "./types";

type Screen = "welcome" | "intro" | "stage" | "between" | "done";

function Panel({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
            <div className="card w-full max-w-lg bg-base-100 shadow-xl">
                <div className="card-body items-center text-center gap-4">{children}</div>
            </div>
        </div>
    );
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

export default function App() {
    const [screen, setScreen] = useState<Screen>("welcome");
    const [index, setIndex] = useState(0);
    const [results, setResults] = useState<StageResult[]>([]);
    const [sessions, setSessions] = useState<Session[]>(() => loadSessions());
    const [showData, setShowData] = useState(false);
    const [participantId, setParticipantId] = useState(
        () => `P-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    );
    const startedAt = useRef("");
    const sessionId = useRef("");
    const finishedAt = useRef("");

    const buildSession = (): Session => ({
        sessionId: sessionId.current,
        participantId,
        startedAt: startedAt.current,
        finishedAt: finishedAt.current,
        userAgent: navigator.userAgent,
        stages: results,
    });

    const begin = () => {
        unlockAudio(); // needs a click so the browser allows sound
        startedAt.current = new Date().toISOString();
        sessionId.current = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        setResults([]);
        setIndex(0);
        setShowData(false);
        setScreen("intro");
    };

    const handleStageComplete = (r: StageResult) => {
        setResults(prev => [...prev, r]);
        setScreen("between");
    };

    const next = () => {
        const nextIndex = index + 1;
        if (nextIndex >= STAGES.length) {
            finishedAt.current = new Date().toISOString();
            const finished = buildSession();
            saveSession(finished);
            setSessions(prev => [...prev, finished]);
            setScreen("done");
            return;
        }
        setIndex(nextIndex);
        setScreen("intro");
    };

    const downloadThisSession = (kind: "csv" | "json") => {
        const s = buildSession();
        const base = `simon_${s.participantId}_${s.sessionId}`;
        if (kind === "csv") downloadFile(`${base}.csv`, "text/csv", toCSV([s]));
        else downloadFile(`${base}.json`, "application/json", toJSON([s]));
    };

    if (screen === "welcome") {
        return (
            <div className="min-h-screen bg-base-200 p-4 flex flex-col items-center justify-center gap-6">
                <div className="card w-full max-w-lg bg-base-100 shadow-xl">
                    <div className="card-body items-center text-center gap-4">
                        <h1 className="text-3xl font-bold">Simon Says test</h1>
                        <p className="opacity-70">
                            Two short stages: one with beeps and one in complete silence. Turn your sound on. A wrong
                            press is recorded and the test continues.
                        </p>
                        <label className="form-control w-full max-w-xs">
                            <span className="label-text mb-1 block text-left">Participant ID</span>
                            <input
                                className="input input-bordered w-full"
                                value={participantId}
                                onChange={e => setParticipantId(e.target.value.replace(/[^\w-]/g, ""))}
                            />
                        </label>
                        <button className="btn btn-primary btn-lg" onClick={begin} disabled={!participantId}>
                            Start Test
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => setShowData(v => !v)}>
                            {showData ? "Hide gathered data" : `View gathered data (${sessions.length})`}
                        </button>
                    </div>
                </div>

                {showData && (
                    <DataPanel
                        sessions={sessions}
                        onClear={() => {
                            clearSessions();
                            setSessions([]);
                        }}
                    />
                )}
            </div>
        );
    }

    if (screen === "intro") {
        const info = STAGE_INFO[STAGES[index].audioMode];
        return (
            <Panel>
                <h2 className="text-2xl font-bold">{info.title}</h2>
                <p className="opacity-80">{info.text}</p>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        unlockAudio();
                        setScreen("stage");
                    }}
                >
                    Begin
                </button>
            </Panel>
        );
    }

    if (screen === "stage") {
        return <SimonStage key={index} config={STAGES[index]} onComplete={handleStageComplete} />;
    }

    if (screen === "between") {
        const r = results[results.length - 1];
        const last = index === STAGES.length - 1;
        return (
            <Panel>
                <h2 className="text-2xl font-bold">Stage {r.config.stage} complete</h2>
                <p className="opacity-80">
                    {r.correctPresses} of {r.totalPresses} presses correct
                </p>
                <button className="btn btn-primary" onClick={next}>
                    {last ? "See results" : "Continue"}
                </button>
            </Panel>
        );
    }

    return (
        <Panel>
            <h2 className="text-2xl font-bold">Test complete</h2>
            <div className="overflow-x-auto w-full">
                <table className="table table-sm">
                    <thead>
                        <tr>
                            <th>Stage</th>
                            <th>Sound</th>
                            <th>Accuracy</th>
                            <th>Mean reaction</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map(r => (
                            <tr key={r.config.stage}>
                                <td>{r.config.stage}</td>
                                <td>{AUDIO_LABEL[r.config.audioMode]}</td>
                                <td>{pct(r.accuracy)}</td>
                                <td>{r.meanReactionMs !== null ? `${r.meanReactionMs} ms` : "–"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex gap-3">
                <button className="btn btn-primary btn-sm" onClick={() => downloadThisSession("csv")}>
                    Download CSV
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => downloadThisSession("json")}>
                    Download JSON
                </button>
            </div>
            <div className="flex gap-3">
                <button
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                        setShowData(true);
                        setScreen("welcome");
                    }}
                >
                    View gathered data
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setScreen("welcome")}>
                    Main page
                </button>
            </div>
        </Panel>
    );
}
