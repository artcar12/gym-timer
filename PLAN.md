# gym-timer plan

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
- Vite 8 requires Node 24. The shell default is Node 18 on purpose; prepend
  `$HOME/.nvm/versions/node/<v24.x>/bin` to PATH per command, never change the default.
- Storage: IndexedDB via `idb-keyval`.
- Deploy target: GitHub Pages (personal repo, Claude attribution lines in commits are fine).

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

- Task tracking lives in this repo with Backlog.md (`backlog init` here, then `backlog task ...`).
  Every build-order step below becomes one or more Backlog tasks with acceptance criteria. Task
  state is the source of truth for what is done; no separate TODO files.
- Session roles:
  - Coordinator: one Claude Fable 5.1 session at high effort, opened in this folder. It owns the
    Backlog board, breaks steps into tasks, starts child sessions, checks their results against
    the acceptance criteria, and merges. It does not write feature code itself.
  - Work sessions: Claude Opus 5.5 at medium effort, one per task, started by the coordinator with
    a brief that names the task id, the files, and what done looks like. Each works on its own
    branch/worktree and commits there.
  - Review sessions: Claude Opus 5.5, started by the coordinator after a work session reports
    done, reviewing that branch's diff for correctness against the task's acceptance criteria.
    Findings go back to the work session (or a new one) before merge.
- Flow per task: coordinator sets task to In Progress, starts work session, work session commits
  and reports, coordinator starts review session, fixes loop until clean, coordinator merges to
  main and marks the task Done.
- Personal repo: Claude attribution lines in commits are fine.

## Build order

1. Scaffold: git init, Vite + Preact + TS, Vitest, Prettier, `engines` field pinned to Node 24.
2. Timer core as a pure module with tests (timestamp math, state machine, pause/resume).
3. Main screen UI with presets and controls.
4. Wake lock, audio, vibration, done state.
5. Exercises, set recording, counter, persistence.
6. Today and History screens, export.
7. PWA: manifest, service worker via `vite-plugin-pwa`, install prompt, GitHub Pages deploy.
