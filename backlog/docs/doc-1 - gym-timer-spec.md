---
id: doc-1
title: gym-timer spec
type: specification
created_date: '2026-11-17 00:27'
updated_date: '2026-11-17 00:32'
---
Personal project. A rest timer for gym workouts, modelled on the Android Clock app's Timer tab,
that also counts how many times the timer was started per exercise per workout.

## Decisions (made, do not re-ask)

- Web app, mobile first. PWA is optional and comes last.
- Countdown timer with presets. Not a stopwatch.
- Counts are per exercise, per workout. A workout is a calendar day, created automatically.
- The counter increments on Start (a start = a set), with manual +1 / -1 to fix mis-taps.
- No backend. All data stays on the device.

## Stack

- Vite + Preact + TypeScript. Vitest for unit tests. Prettier.
- Node 24 (Vite 8 needs it; pinned in `.nvmrc` and `engines`).
- Storage: IndexedDB via `idb-keyval`.
- Deploy target: GitHub Pages.

## Timer behaviour

- Remaining time is computed from a stored start timestamp + duration, never by counting ticks.
  On `visibilitychange` just recompute; background tabs throttle timers.
- Screen Wake Lock API while running (the only reliable way to keep a web timer alive on Android).
- At zero: Web Audio beep (unlock the AudioContext on the Start tap), `navigator.vibrate`, and a
  visible flashing done state. Alarm repeats until dismissed.
- States: idle, running, paused, done. Pause, resume, reset. Optional +30s while running.

## Data model

- `exercises`: id, name, lastUsed
- `sets`: id, exerciseId, startedAt, durationS
- Per-exercise counts, today view and history are all derived from `sets`. Nothing stored twice.

## Screens

- Main: recent-exercise chips (+ new), preset chips (30s, 60s, 90s, 2m, custom), big countdown
  dial, Start/Pause/Reset, set-count badge for the selected exercise today. Material 3 feel, dark
  by default, large tap targets. Last-used exercise stays selected.
- Today: exercises with set counts for the day.
- History: previous days, expandable to per-exercise counts, JSON export.

## Workflow

Per Arthur's working-standard skill (adopted in TASK-8, 2026-11-16). The original coordinator / work-session / review-session process in PLAN.md is superseded by it.

## Build order

1. Scaffold: git init, Vite + Preact + TS, Vitest, Prettier, `engines` field pinned to Node 24.
2. Timer core as a pure module with tests (timestamp math, state machine, pause/resume).
3. Main screen UI with presets and controls.
4. Wake lock, audio, vibration, done state.
5. Exercises, set recording, counter, persistence.
6. Today and History screens, export.
7. PWA: manifest, service worker via `vite-plugin-pwa`, install prompt, GitHub Pages deploy.

All seven steps are done (TASK-1 to TASK-7). Live at https://artcar12.github.io/gym-timer/.

Imported from PLAN.md in TASK-8 (2026-11-16).
