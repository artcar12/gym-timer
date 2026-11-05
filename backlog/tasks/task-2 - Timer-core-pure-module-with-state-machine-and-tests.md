---
id: TASK-2
title: 'Timer core: pure module with state machine and tests'
status: In Progress
assignee: []
created_date: '2026-11-05 19:41'
updated_date: '2026-11-05 19:52'
labels:
  - timer
dependencies:
  - TASK-1
priority: high
ordinal: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build-order step 2 from PLAN.md. Implement the timer core as a pure TypeScript module in src/timer/ (no DOM, no Preact, no globals like Date.now or setTimeout inside the module). States: idle, running, paused, done. Remaining time is computed from a stored start timestamp + duration using an injectable clock (now: () => number in ms), never by counting ticks. Operations: start(durationMs), pause, resume, reset, add30s (+30s while running or paused), and a tick/recompute that moves running -> done when remaining reaches 0. Expose remaining time and state as derived values. Cover everything with Vitest tests using a fake clock.

Node: the shell default is Node 18 ON PURPOSE. Never change the default. Prepend $HOME/.nvm/versions/node/v24.15.0/bin to PATH per command, e.g. PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH npm test.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 src/timer/ exports a pure timer module with no DOM, window, document, Date.now or timer globals used inside it
- [x] #2 States are exactly idle, running, paused, done, with transitions: idle->running (start), running->paused (pause), paused->running (resume), running->done (remaining hits 0), any->idle (reset)
- [x] #3 Remaining time is derived from start timestamp + duration via an injectable clock; it is correct after arbitrary time jumps (simulates a backgrounded tab)
- [x] #4 Pause freezes remaining time; resume continues from the paused remaining, not from the original start
- [x] #5 +30s extends the duration while running or paused; remaining increases by exactly 30000 ms
- [x] #6 Reset returns to idle from any state
- [x] #7 Invalid transitions (e.g. pause while idle) are no-ops or throw consistently, and that behaviour is tested
- [x] #8 Vitest tests cover every transition and the time math with a fake clock; npm test passes; npm run build passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. src/timer/timer.ts: discriminated-union TimerState, TimerAction, pure reduce(state, action, nowMs) and remainingMs(state, nowMs). Running stores startedAt + durationMs (time left at start/resume); paused stores remainingMs; totalMs kept for a progress dial.
2. Policy: invalid transitions are no-ops returning the same state object; invalid arguments (non-finite or non-positive duration, non-finite now) throw RangeError. Any action on an expired running timer settles it to done first.
3. Small createTimer(clock) wrapper over the pure functions. Public API re-exported from src/timer/index.ts with JSDoc.
4. Vitest tests (node environment) with a hand-advanced fake clock covering every transition, time jumps, pause/resume, +30s, reset from every state, and the policy.
5. npm test, build, format:check on Node 24.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Pure core in src/timer/timer.ts: immutable TimerState union (idle/running/paused/done), reduce(state, action, nowMs) and remainingMs(state, nowMs). Running stores startedAt + durationMs (time left at start/resume), so remaining is derived, not ticked; paused stores remainingMs; totalMs tracks full length incl. +30s for a progress dial; done stores the true finishedAt. createTimer(now) is a thin stateful wrapper with an injected clock. Public API in src/timer/index.ts.
Policy: disallowed transitions are no-ops returning the same object (=== detectable). Invalid arguments throw RangeError (start duration not finite > 0, non-finite now). Any action first settles an expired running timer to done, so pause/add30s after expiry give done. start is only valid from idle (UI resets from done first). add30s is a no-op in idle and done.
Verification on Node 24: npm test (40 tests, incl. a purity test that scans the module sources for DOM/clock/timer globals), npm run build, npm run format:check all pass.
<!-- SECTION:NOTES:END -->
