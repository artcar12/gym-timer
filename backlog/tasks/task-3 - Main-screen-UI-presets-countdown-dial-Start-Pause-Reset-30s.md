---
id: TASK-3
title: 'Main screen UI: presets, countdown dial, Start/Pause/Reset, +30s'
status: Done
assignee: []
created_date: '2026-11-05 19:58'
updated_date: '2026-11-05 20:09'
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
- [x] #1 Preset chips 30s, 60s, 90s, 2m and a custom option (prompt or small input for minutes:seconds); tapping a preset selects it and, when idle or done, starts the timer (done is reset first)
- [x] #2 Countdown dial shows remaining time as mm:ss (ceil of remaining ms to whole seconds, so 10.0s shows 00:10 and 0 shows 00:00) with a progress ring driven by remaining/totalMs
- [x] #3 Controls: Start (idle), Pause (running), Resume (paused), Reset (any non-idle state), +30s (running or paused); only the controls valid for the current state are enabled/shown
- [x] #4 Remaining time is computed from the timer core with Date.now on every render; a rAF/interval loop only re-renders and dispatches tick; a visibilitychange listener triggers a recompute; no setInterval-based counting
- [x] #5 Reaching zero shows a clearly distinct done state (e.g. 00:00 with a 'Done' label and highlighted dial) until Reset or a preset tap; no audio/vibration/wake lock yet
- [x] #6 Dark Material-3-style theme by default with light variant via prefers-color-scheme; all tap targets at least 48x48 CSS px; layout usable at 360px width without horizontal scroll
- [x] #7 Timer UI logic is in a hook or small module (e.g. src/ui/useTimer.ts) that takes an injectable clock, with Vitest tests using fake timers for: preset start, pause/resume display, +30s, done display, reset; component smoke test renders presets and controls
- [x] #8 npm test, npm run build and npm run format:check pass on Node 24; no changes to src/timer/ except additive exports if truly needed (say so in the report)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. src/ui/useTimer.ts: hook over reduce/remainingMs with injectable clock and scheduler (rAF default); loop runs only while running, dispatches tick and forces re-render; visibilitychange recompute.
2. src/ui/format.ts: ceil-to-seconds mm:ss, progress helper.
3. Components in src/ui/ (TimerScreen, PresetChips, Dial, Controls), App renders TimerScreen; plain CSS with M3-ish tokens in src/styles/app.css.
4. Tests: hook tests with fake timers, format tests, component smoke test.
5. Check 360px layout in browser, run test/build/format:check.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
useTimer (src/ui/useTimer.ts) wraps reduce/remainingMs with injectable now (default Date.now) and Scheduler (default rAF). Frame loop runs only while running; each frame dispatches tick and bumps a frame counter to force a render; remaining/display/progress are derived on every render from now(). visibilitychange dispatches tick + re-render. selectPreset settles with tick, resets if done, starts if idle; while running/paused it only selects. Idle shows the selected duration with a full ring. Custom: inline m:ss input (also accepts m.ss and plain seconds, since Android decimal keypads lack a colon). Components (Dial, PresetChips, Controls, TimerScreen) are thin. CSS in src/styles/app.css with M3-style tokens, dark default, light via prefers-color-scheme. No changes to src/timer/. Verified: npm test (57 pass, incl. hook tests with fake timers and App smoke tests), npm run build, npm run format:check on Node 24; browser check at 360x740: no horizontal scroll, no button/input under 48px, running, done (tertiary dial + DONE label) and light theme look right.

Review follow-up: preset chips (incl. custom) are disabled and taps ignored while running/paused (useTimer.canSelectPreset; selectPreset is a no-op there), so the highlighted chip always matches the dial. A set custom value is now a split chip: tapping the value selects and starts like a fixed preset, a separate 48px pencil button edits it; the custom value is remembered across fixed-preset picks. 59 tests, build and format:check pass on Node 24; checked at 360px.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Main screen UI merged to main (0ec8341 + review fixes 4fad43d). Reviewed clean, hand-tested at 360px. 59 tests, build and format clean.
<!-- SECTION:FINAL_SUMMARY:END -->
