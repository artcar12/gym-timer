---
id: TASK-4
title: 'Wake lock, alarm audio, vibration, flashing done state'
status: In Progress
assignee: []
created_date: '2026-11-05 20:10'
updated_date: '2026-11-05 20:10'
labels:
  - ui
dependencies:
  - TASK-3
priority: high
ordinal: 4
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build-order step 4 from PLAN.md. Make the timer usable on a phone: keep the screen awake while running, and make reaching zero unmissable. Everything here is browser side effects driven from the existing useTimer hook (src/ui/useTimer.ts) and TimerScreen; the pure core in src/timer/ stays untouched.

Behaviour from PLAN.md: Screen Wake Lock API while running (release on pause/done/reset/unmount, re-acquire on visibilitychange when still running). At zero: Web Audio beep (AudioContext created and unlocked synchronously in the Start / preset tap click handler, never inside a setState updater), navigator.vibrate pattern, and a visible flashing done state. The alarm repeats until dismissed (tap anywhere on the dial, Reset, or a preset tap stops it). Done detection cannot rely on the rAF loop (it stops in hidden tabs): arm a setTimeout for the remaining ms on start, resume and +30s, clear it on pause/reset/done, and also check on visibilitychange.

All browser APIs go behind small injectable adapters (wake lock, audio, vibration, timeout scheduler) with no-op fallbacks when the API is missing, so the hook stays testable with fakes in jsdom and the app never throws on a browser without them.

Node: the shell default is Node 18 ON PURPOSE. Never change the default. Prepend $HOME/.nvm/versions/node/v24.15.0/bin to PATH per command, e.g. PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH npm test.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Wake lock requested when the timer enters running (start, resume, preset start) and released on pause, done, reset and unmount; re-requested on visibilitychange to visible while running; failures (unsupported, denied) are swallowed and logged at most once
- [ ] #2 AudioContext is created/resumed synchronously inside the user's Start or preset click handler (not in an updater or effect), so the alarm plays on Android Chrome; a short Web Audio beep pattern plays at done and repeats (e.g. every 1 s) until dismissed
- [ ] #3 navigator.vibrate is called with a pattern at done and repeated with the alarm; no-op where unsupported
- [ ] #4 Done state flashes visibly (CSS animation on the dial/background) while the alarm is active and stops flashing when dismissed; prefers-reduced-motion disables the flash but keeps the done colour
- [ ] #5 Dismiss: tapping the dial, Reset, or a preset tap stops audio, vibration and flashing; Reset returns to idle, a preset tap starts the new timer
- [ ] #6 Done is detected by a setTimeout armed with the remaining ms on start, resume and +30s and cleared on pause/reset/done, plus a recompute on visibilitychange; a timer that expires while the tab is hidden shows done and alarms when the tab becomes visible (or earlier if the timeout fires)
- [ ] #7 Browser APIs (wake lock, audio, vibrate, timeouts) are behind injectable adapters with safe no-op fallbacks; the hook/tests use fakes; nothing throws in jsdom or in a browser lacking these APIs
- [ ] #8 Vitest tests cover: wake lock acquire/release per transition, alarm starts at done and repeats, alarm stops on each dismiss path, vibration called, timeout armed/cleared correctly including after +30s and pause/resume, hidden-tab expiry; component test shows the flashing done state
- [ ] #9 npm test, npm run build and npm run format:check pass on Node 24; src/timer/ untouched
<!-- AC:END -->
