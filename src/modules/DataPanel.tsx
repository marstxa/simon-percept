import type { ChartConfiguration } from "chart.js";
import { useMemo } from "react";
import { AUDIO_LABEL } from "../config";
import { downloadFile, toCSV, toJSON } from "../lib/exportData";
import type { Session } from "../types";
import { analyse, MAX_SEQUENCE_LENGTH } from "./analysis";
import ChartCanvas from "./ChartCanvas";

const BEEP_COLOR = "#3b82f6";
const MUTE_COLOR = "#f59e0b";

interface Props {
    sessions: Session[];
    onClear: () => void;
}

export default function DataPanel({ sessions, onClear }: Props) {
    const charts = useMemo(() => {
        const stats = analyse(sessions);
        const labels = [AUDIO_LABEL.beep, AUDIO_LABEL.mute];
        const lengths = Array.from({ length: MAX_SEQUENCE_LENGTH }, (_, i) => String(i + 1));

        const baseOptions = (title: string, yTitle: string) => ({
            responsive: true,
            maintainAspectRatio: false,
            plugins: { title: { display: true, text: title } },
            scales: { y: { title: { display: true, text: yTitle } } },
        });

        // neeps vs Muted (bar)
        const accuracy: ChartConfiguration = {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        data: [stats.beep.accuracy, stats.mute.accuracy],
                        backgroundColor: [BEEP_COLOR, MUTE_COLOR],
                    },
                ],
            },
            options: {
                ...baseOptions("Accuracy by condition", "Correct presses (%)"),
                plugins: { title: { display: true, text: "Accuracy by condition" }, legend: { display: false } },
                scales: { y: { min: 0, max: 100, title: { display: true, text: "Correct presses (%)" } } },
            },
        };

        // mean reaction time: Beeps vs Muted (bar)
        const reaction: ChartConfiguration = {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        data: [stats.beep.meanRT, stats.mute.meanRT],
                        backgroundColor: [BEEP_COLOR, MUTE_COLOR],
                    },
                ],
            },
            options: {
                ...baseOptions("Mean reaction time by condition", "Milliseconds"),
                plugins: {
                    title: { display: true, text: "Mean reaction time by condition" },
                    legend: { display: false },
                },
                scales: { y: { beginAtZero: true, title: { display: true, text: "Milliseconds (correct presses)" } } },
            },
        };

        // accuracy as the sequence grows (line)
        const byRound: ChartConfiguration = {
            type: "line",
            data: {
                labels: lengths,
                datasets: [
                    {
                        label: AUDIO_LABEL.beep,
                        data: stats.beep.accuracyByRound,
                        borderColor: BEEP_COLOR,
                        backgroundColor: BEEP_COLOR,
                        tension: 0.3,
                        spanGaps: true,
                    },
                    {
                        label: AUDIO_LABEL.mute,
                        data: stats.mute.accuracyByRound,
                        borderColor: MUTE_COLOR,
                        backgroundColor: MUTE_COLOR,
                        tension: 0.3,
                        spanGaps: true,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { title: { display: true, text: "Accuracy as the sequence grows" } },
                scales: {
                    x: { title: { display: true, text: "Sequence length" } },
                    y: { min: 0, max: 100, title: { display: true, text: "Correct presses (%)" } },
                },
            },
        };

        // reaction time by position in the sequence (line)
        const byPosition: ChartConfiguration = {
            type: "line",
            data: {
                labels: lengths,
                datasets: [
                    {
                        label: AUDIO_LABEL.beep,
                        data: stats.beep.rtByPosition,
                        borderColor: BEEP_COLOR,
                        backgroundColor: BEEP_COLOR,
                        tension: 0.3,
                        spanGaps: true,
                    },
                    {
                        label: AUDIO_LABEL.mute,
                        data: stats.mute.rtByPosition,
                        borderColor: MUTE_COLOR,
                        backgroundColor: MUTE_COLOR,
                        tension: 0.3,
                        spanGaps: true,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { title: { display: true, text: "Reaction time by position in the sequence" } },
                scales: {
                    x: { title: { display: true, text: "Position in sequence" } },
                    y: { beginAtZero: true, title: { display: true, text: "Milliseconds (correct presses)" } },
                },
            },
        };

        return { accuracy, reaction, byRound, byPosition };
    }, [sessions]);

    if (sessions.length === 0) {
        return (
            <div className="card w-full max-w-4xl bg-base-100 shadow-xl">
                <div className="card-body items-center text-center">
                    <p className="opacity-70">No data gathered yet. Complete a test and it will show up here.</p>
                </div>
            </div>
        );
    }

    const participants = new Set(sessions.map(s => s.participantId)).size;
    const totalPresses = sessions.reduce((n, s) => n + s.stages.reduce((m, st) => m + st.totalPresses, 0), 0);

    return (
        <div className="w-full max-w-4xl space-y-4">
            <div className="stats stats-vertical sm:stats-horizontal shadow w-full bg-base-100">
                <div className="stat">
                    <div className="stat-title">Sessions</div>
                    <div className="stat-value text-2xl">{sessions.length}</div>
                </div>
                <div className="stat">
                    <div className="stat-title">Participants</div>
                    <div className="stat-value text-2xl">{participants}</div>
                </div>
                <div className="stat">
                    <div className="stat-title">Button presses</div>
                    <div className="stat-value text-2xl">{totalPresses}</div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {[charts.accuracy, charts.reaction, charts.byRound, charts.byPosition].map((cfg, i) => (
                    <div key={i} className="card bg-base-100 shadow">
                        <div className="card-body p-4">
                            <ChartCanvas config={cfg} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap justify-center gap-3">
                <button
                    className="btn btn-primary btn-sm"
                    onClick={() => downloadFile("simon_all_sessions.csv", "text/csv", toCSV(sessions))}
                >
                    Download all as CSV
                </button>
                <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => downloadFile("simon_all_sessions.json", "application/json", toJSON(sessions))}
                >
                    Download all as JSON
                </button>
                <button
                    className="btn btn-error btn-outline btn-sm"
                    onClick={() => {
                        if (window.confirm("Delete all gathered data from this browser?")) onClear();
                    }}
                >
                    Clear data
                </button>
            </div>
        </div>
    );
}
