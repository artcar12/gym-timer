---
id: TASK-5
title: 'Exercises, set recording on Start, set counter, IndexedDB persistence'
status: In Progress
assignee: []
created_date: '2026-11-05 22:06'
updated_date: '2026-11-05 22:06'
labels:
  - data
  - ui
dependencies:
  - TASK-4
priority: high
ordinal: 5
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build-order step 5 from PLAN.md. Add the exercise/set layer on top of the timer UI. Data model from PLAN.md, stored in IndexedDB via idb-keyval: exercises (id, name, lastUsed) and sets (id, exerciseId, startedAt, durationS). Per-exercise counts, today view and history are derived from sets; nothing is stored twice. A workout is a calendar day (local time), created implicitly by the first set of that day. The counter increments on Start (a start = a set): every transition idle->running that is initiated by Start or a preset tap records a set for the selected exercise with startedAt = now and durationS = the duration started; resume and +30s do not record. Manual +1 / -1 on the badge fix mis-taps (+1 appends a set with the selected duration, -1 deletes the latest set for that exercise today). Main screen gets recent-exercise chips (most recent lastUsed first, plus a + new chip that prompts for a name) and a set-count badge for the selected exercise today; the last-used exercise stays selected across reloads. Starting with no exercise selected is allowed and records nothing (badge hidden).

Structure: a pure store module (src/data/) with a repository interface (list/add exercises, add/delete sets, query sets by day) and two implementations: in-memory (for tests) and idb-keyval. Derivations (counts per exercise per day, recent exercises) are pure functions over arrays. The hook that wires timer start -> set recording must call the repository as a plain side effect from the start/selectPreset handlers in src/ui/useTimer.ts (they already compute the next state outside the updater), e.g. via an onStarted(durationMs) option, never inside a setState updater. Keep the timer core in src/timer/ untouched.

Node: the shell default is Node 18 ON PURPOSE. Never change the default. Prepend $HOME/.nvm/versions/node/v24.15.0/bin to PATH per command, e.g. PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH npm test.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 src/data/ defines Exercise {id, name, lastUsed} and SetRecord {id, exerciseId, startedAt, durationS} and a Repository interface; an in-memory implementation and an idb-keyval implementation both pass the same shared test suite
- [ ] #2 Pure derivation functions: setsForDay(sets, dayKey), countsByExercise(sets), recentExercises(exercises, limit) with tests; a day key is the local calendar date (YYYY-MM-DD) of startedAt
- [ ] #3 Every Start or preset tap that moves the timer from idle (or done, via reset) to running records exactly one set for the selected exercise with startedAt=now and durationS=started duration; resume, +30s, pause and reset record nothing; with no exercise selected nothing is recorded
- [ ] #4 Set recording is a plain side effect invoked from the start/selectPreset handlers (an onStarted-style option on useTimer), not inside a setState updater or effect; tests prove one set per start and none on double-tap or resume
- [ ] #5 Main screen shows recent-exercise chips (ordered by lastUsed desc, at most ~6, plus a '+ new' chip that prompts for a name and creates and selects it); tapping a chip selects it and updates its lastUsed; selection persists across reload (last-used stays selected)
- [ ] #6 A set-count badge next to the dial shows today's count for the selected exercise, with +1 and -1 buttons (48px targets); +1 adds a set with the selected duration, -1 removes the most recent set for that exercise today and does nothing at 0; hidden when no exercise is selected
- [ ] #7 Persistence via idb-keyval; the app loads existing data on startup before rendering counts (loading state is not a flash of 0 that then jumps); storage errors are caught and logged, never crash the timer
- [ ] #8 Timer behaviour from steps 2-4 unchanged (all existing tests still pass); src/timer/ untouched; tap targets stay >= 48px and the layout still fits 360px wide without horizontal scroll
- [ ] #9 npm test, npm run build and npm run format:check pass on Node 24
<!-- AC:END -->
