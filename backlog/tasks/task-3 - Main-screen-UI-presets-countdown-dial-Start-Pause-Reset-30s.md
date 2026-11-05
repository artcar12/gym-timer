---
id: TASK-3
title: 'Main screen UI: presets, countdown dial, Start/Pause/Reset, +30s'
status: In Progress
assignee: []
created_date: '2026-11-05 19:58'
updated_date: '2026-11-05 19:58'
labels:
  - ui
dependencies:
  - TASK-2
priority: high
ordinal: 3
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build-order step 3 from PLAN.md. Build the main screen in Preact on top of the pure timer core in src/timer/ (reduce, remainingMs, createTimer, injectable clock; see src/timer/timer.ts module comment). Scope is the timer UI only: preset chips (30s, 60s, 90s, 2m, custom), a big countdown dial with mm:ss and a progress ring, Start / Pause / Resume / Reset controls, +30s while running or paused, and a plain done state (text/visual only; the flashing alarm, audio, vibration and wake lock are step 4; exercise chips and set-count badge are step 5).

Timer driving rules from PLAN.md: the UI reads time via Date.now (persisted-state safe), never counts ticks; a requestAnimationFrame or short interval only triggers re-render and dispatches tick; on visibilitychange it just recomputes. Start from done is a no-op in the core, so tapping a preset after done must reset then start. Material 3 feel, dark by default (respect prefers-color-scheme), large tap targets (min 48px), mobile first.

Node: the shell default is Node 18 ON PURPOSE. Never change the default. Prepend $HOME/.nvm/versions/node/v24.15.0/bin to PATH per command, e.g. PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH npm test.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Preset chips 30s, 60s, 90s, 2m and a custom option (prompt or small input for minutes:seconds); tapping a preset selects it and, when idle or done, starts the timer (done is reset first)
- [ ] #2 Countdown dial shows remaining time as mm:ss (ceil of remaining ms to whole seconds, so 10.0s shows 00:10 and 0 shows 00:00) with a progress ring driven by remaining/totalMs
- [ ] #3 Controls: Start (idle), Pause (running), Resume (paused), Reset (any non-idle state), +30s (running or paused); only the controls valid for the current state are enabled/shown
- [ ] #4 Remaining time is computed from the timer core with Date.now on every render; a rAF/interval loop only re-renders and dispatches tick; a visibilitychange listener triggers a recompute; no setInterval-based counting
- [ ] #5 Reaching zero shows a clearly distinct done state (e.g. 00:00 with a 'Done' label and highlighted dial) until Reset or a preset tap; no audio/vibration/wake lock yet
- [ ] #6 Dark Material-3-style theme by default with light variant via prefers-color-scheme; all tap targets at least 48x48 CSS px; layout usable at 360px width without horizontal scroll
- [ ] #7 Timer UI logic is in a hook or small module (e.g. src/ui/useTimer.ts) that takes an injectable clock, with Vitest tests using fake timers for: preset start, pause/resume display, +30s, done display, reset; component smoke test renders presets and controls
- [ ] #8 npm test, npm run build and npm run format:check pass on Node 24; no changes to src/timer/ except additive exports if truly needed (say so in the report)
<!-- AC:END -->
