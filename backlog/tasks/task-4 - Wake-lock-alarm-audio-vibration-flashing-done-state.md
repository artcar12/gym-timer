---
id: TASK-4
title: 'Wake lock, alarm audio, vibration, flashing done state'
status: Done
assignee: []
created_date: '2026-11-05 20:10'
updated_date: '2026-11-05 20:22'
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
- [x] #1 Wake lock requested when the timer enters running (start, resume, preset start) and released on pause, done, reset and unmount; re-requested on visibilitychange to visible while running; failures (unsupported, denied) are swallowed and logged at most once
- [x] #2 AudioContext is created/resumed synchronously inside the user's Start or preset click handler (not in an updater or effect), so the alarm plays on Android Chrome; a short Web Audio beep pattern plays at done and repeats (e.g. every 1 s) until dismissed
- [x] #3 navigator.vibrate is called with a pattern at done and repeated with the alarm; no-op where unsupported
- [x] #4 Done state flashes visibly (CSS animation on the dial/background) while the alarm is active and stops flashing when dismissed; prefers-reduced-motion disables the flash but keeps the done colour
- [x] #5 Dismiss: tapping the dial, Reset, or a preset tap stops audio, vibration and flashing; Reset returns to idle, a preset tap starts the new timer
- [x] #6 Done is detected by a setTimeout armed with the remaining ms on start, resume and +30s and cleared on pause/reset/done, plus a recompute on visibilitychange; a timer that expires while the tab is hidden shows done and alarms when the tab becomes visible (or earlier if the timeout fires)
- [x] #7 Browser APIs (wake lock, audio, vibrate, timeouts) are behind injectable adapters with safe no-op fallbacks; the hook/tests use fakes; nothing throws in jsdom or in a browser lacking these APIs
- [x] #8 Vitest tests cover: wake lock acquire/release per transition, alarm starts at done and repeats, alarm stops on each dismiss path, vibration called, timeout armed/cleared correctly including after +30s and pause/resume, hidden-tab expiry; component test shows the flashing done state
- [x] #9 npm test, npm run build and npm run format:check pass on Node 24; src/timer/ untouched
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. src/platform/: timeouts.ts, wakeLock.ts, audio.ts, vibrate.ts adapters with no-op fallbacks.
2. useTimer: options for adapters; setTimeout(remaining) done detection keyed on running state object; wake lock effect on running + re-acquire on visible; audio.unlock() synchronously in start/resume/selectPreset handlers; alarming derived from done + dismissed state; repeating alarm effect.
3. Dial: alarm flash class, tap to dismiss; CSS animation with reduced-motion fallback.
4. Tests: adapters, hook wiring with fakes, component flash/dismiss.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Adapters in src/platform/ (timeouts.ts, wakeLock.ts, audio.ts, vibrate.ts, index.ts), each a no-op when its API is missing; defaults are module-level singletons that touch no browser API until called. useTimer takes wakeLock/audio/vibrator/timeouts options (stable refs).
Done detection: effect keyed on the running state object arms timeouts.set(remainingMs); new object on start/resume/+30s re-arms, leaving running clears; fires early -> re-arms for the rest. rAF loop is now display-only (setFrame, no tick). visibilitychange still recomputes and re-acquires the wake lock if still running.
Audio unlock: audio.unlock() called synchronously at the top of start, resume and selectPreset (every tap, idempotent); no updater/effect involvement. Wake lock: effect on running boolean (acquire/release), so it follows the transition, never inside an updater; adapter is idempotent, releases a late-resolving request, logs once.
Alarm: alarming = done && dismissed !== state (identity of the done object), effect beeps + vibrates every 1s via timeouts and stops audio/vibration on cleanup. Dial gets dial--alarm (CSS flash, reduced-motion sets animation none, done colour kept), role=button 'Dismiss alarm' while alarming.
Verified: npm test (85 tests), npm run build, npm run format:check on Node 24.15.0; src/timer untouched. Browser pane: done dial flashes (background alternates), dial tap stops flash and keeps done colour, reduced-motion rule present in CSSOM, wake lock denial in the pane logged once. NOT verified (needs a phone): audible beep after unlock on Android Chrome, vibration, wake lock actually keeping the screen on.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Wake lock, alarm audio, vibration, flashing done state merged to main (26a2b36 + review fixes 0b2606d). Reviewed clean, browser-checked at 360px. 87 tests, build and format clean. Sound, vibration and real wake lock still unverified on a phone.
<!-- SECTION:FINAL_SUMMARY:END -->
