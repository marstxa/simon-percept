# Simon Says Cognitive Test

A short Simon Says memory test built with React, TypeScript, Tailwind CSS and DaisyUI. It compares how people recall a colour sequence **with beeps** and **in complete silence**, records every button press, and plots the collected data with Chart.js.

## How the test works

The test has two stages. In each one the app shows a sequence of coloured pads, and the participant repeats it by pressing the pads in the same order. After every correct round the sequence grows by one colour, up to 8.

| Stage | Sound | Description                                                              |
| ----- | ----- | ------------------------------------------------------------------------ |
| 1     | Beeps | Each colour lights up with its own tone, and pressing a pad plays it too |
| 2     | Muted | No sound at all, including on button presses                             |

Both stages use the same difficulty (sequence length up to 8, 450 ms blinks, 200 ms gaps), so the only difference between them is the sound.

A wrong press does not stop the test. It is recorded as incorrect and the round continues to the end of the sequence, so every participant produces the same amount of data.

## Features

- Two-stage test with a participant ID, stage intro screens and a results summary
- Every press recorded with expected colour, pressed colour, correctness and reaction time
- Sessions saved in the browser (`localStorage`) so data accumulates across runs
- "View gathered data" button on the main page that opens four Chart.js graphs
- CSV and JSON export for a single session or for all saved sessions

## Tech stack

- React and TypeScript
- Tailwind CSS and DaisyUI
- Chart.js
- Web Audio API for the beeps (no audio files)

## Getting started

Create a Vite React + TypeScript project (or use your existing one) and install the dependencies:

```bash
npm create vite@latest simon-says-test -- --template react-ts
cd simon-says-test
npm install
npm install chart.js
```

Install and configure Tailwind CSS and DaisyUI by following their docs for the versions you use. Then copy the files into `src/` as shown below and start the dev server:

```bash
npm run dev
```

## Project structure

```
src/
├── main.tsx
├── index.css            # Tailwind + DaisyUI setup
├── App.tsx              # screen flow: welcome, intro, stage, summary, results
└── simon/
    ├── SimonStage.tsx   # the game itself (sequence playback, input, recording)
    ├── DataPanel.tsx    # gathered-data panel with the four charts
    ├── ChartCanvas.tsx  # small Chart.js wrapper
    ├── analysis.ts      # aggregates sessions into chart data
    ├── config.ts        # stage settings, colours and intro texts
    ├── types.ts         # shared TypeScript types
    ├── audio.ts         # Web Audio beeps
    ├── storage.ts       # localStorage load, save and clear
    └── exportData.ts    # CSV and JSON export and file download
```

## Configuration

Stage difficulty lives in `src/simon/config.ts`:

```ts
const DIFFICULTY = { targetLength: 8, blinkMs: 450, gapMs: 200 };
```

- `targetLength`: sequence length the participant must reach to finish a stage
- `blinkMs`: how long each colour stays lit
- `gapMs`: pause between colours

## Collected data

### CSV

One row per button press:

| Column                                | Meaning                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------- |
| `session_id`, `participant_id`        | Identify the session and participant                                       |
| `stage`                               | 1 (beeps) or 2 (muted)                                                     |
| `audio_mode`                          | `beep` or `mute`                                                           |
| `target_length`, `blink_ms`, `gap_ms` | Stage settings                                                             |
| `round`                               | Sequence length during the press                                           |
| `position`                            | Index of the press inside the sequence (starts at 0)                       |
| `expected_color`, `pressed_color`     | What was required and what was pressed                                     |
| `correct`                             | `true` or `false`                                                          |
| `reaction_ms`                         | Time since the sequence finished (first press) or since the previous press |
| `timestamp`                           | ISO timestamp of the press                                                 |

### JSON

An array of sessions. Each session contains the participant ID, timestamps, the user agent and a list of stages. Each stage holds its settings, the full colour sequence, every press, and a summary (total and correct presses, accuracy, mean reaction time).

## Charts

1. **Accuracy by condition** (bar): beeps vs muted
2. **Mean reaction time by condition** (bar): beeps vs muted, correct presses only
3. **Accuracy as the sequence grows** (line): accuracy per sequence length for each condition
4. **Reaction time by position in the sequence** (line): reaction time per position for each condition

## Notes and limitations

- Stage order is fixed (beeps first, muted second), so practice effects may favour stage 2. Randomise the order per participant if you need to control for this.
- Data is stored per browser. Export the files from each machine and combine them for analysis.
- Browsers only allow sound after a click, so audio is unlocked when the participant presses Start Test and Begin.
- Reaction times depend on the device and display, so compare participants on the same setup where possible.
