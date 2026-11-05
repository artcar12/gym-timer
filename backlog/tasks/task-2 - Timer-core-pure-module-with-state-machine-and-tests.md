---
id: TASK-2
title: 'Timer core: pure module with state machine and tests'
status: To Do
assignee: []
created_date: '2026-11-05 19:41'
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
- [ ] #1 src/timer/ exports a pure timer module with no DOM, window, document, Date.now or timer globals used inside it
- [ ] #2 States are exactly idle, running, paused, done, with transitions: idle->running (start), running->paused (pause), paused->running (resume), running->done (remaining hits 0), any->idle (reset)
- [ ] #3 Remaining time is derived from start timestamp + duration via an injectable clock; it is correct after arbitrary time jumps (simulates a backgrounded tab)
- [ ] #4 Pause freezes remaining time; resume continues from the paused remaining, not from the original start
- [ ] #5 +30s extends the duration while running or paused; remaining increases by exactly 30000 ms
- [ ] #6 Reset returns to idle from any state
- [ ] #7 Invalid transitions (e.g. pause while idle) are no-ops or throw consistently, and that behaviour is tested
- [ ] #8 Vitest tests cover every transition and the time math with a fake clock; npm test passes; npm run build passes
<!-- AC:END -->
