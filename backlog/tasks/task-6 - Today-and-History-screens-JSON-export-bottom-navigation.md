---
id: TASK-6
title: 'Today and History screens, JSON export, bottom navigation'
status: In Progress
assignee: []
created_date: '2026-11-05 23:35'
updated_date: '2026-11-05 23:35'
labels:
  - ui
  - data
dependencies:
  - TASK-5
priority: high
ordinal: 6
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build-order step 6 from PLAN.md. Add the two remaining screens and navigation. Today: the day's exercises with set counts (all exercises with at least one set today, most sets first, total at the top), empty state when none. History: previous days (newest first, excluding today), each row shows date and total sets, expandable to per-exercise counts; a JSON export button that downloads all exercises and sets (plus a schema version and exportedAt) as a file via a Blob URL and an anchor download (navigator.share optional, not required). Navigation: a bottom tab bar (Timer, Today, History) with 48px targets, Material 3 feel, dark by default, no router library; the active tab is plain component state (optionally mirrored in location.hash so back works, your call).

Hard rule: switching tabs must not reset or stop the timer. The timer and workout hooks (useTimer, useWorkout) live above the tab switch (in App or a shell component) so the running state, done detection and alarm survive navigation; the Timer screen is a view of that state. The alarm (audio, vibration, flashing) still fires while on Today/History; the done state is visible there too (e.g. the Timer tab shows a dot or the mm:ss of the running timer in the tab bar).

Data: Today and History derive everything from the repository's sets and exercises using the pure helpers in src/data/derive.ts (add groupByDay / per-day per-exercise count helpers with tests). Recompute the current day key on visibilitychange and on tab switch so counts roll over at midnight (carry-over nit from task-5). Also fix the task-5 nit: an exercise selected by typing an existing name that is outside the 6 recent chips must be moved to the front of the chip order so it shows as a chip.

Node: the shell default is Node 18 ON PURPOSE. Never change the default. Prepend $HOME/.nvm/versions/node/v24.15.0/bin to PATH per command, e.g. PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH npm test.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Bottom tab bar with Timer, Today, History; 48px targets; active tab highlighted; works at 360px without horizontal scroll
- [ ] #2 Switching tabs never resets, pauses or stops the timer: the timer and workout state live above the tab switch; a running timer keeps counting and reaches done (with alarm) while on another tab; tests prove the timer state survives a tab switch
- [ ] #3 Today screen lists exercises with at least one set today, most sets first, with the day total; empty state when no sets; counts update live after recording a set on the Timer tab and after +1/-1
- [ ] #4 History screen lists previous days newest first (today excluded), each with date label and total sets, expandable to per-exercise counts; empty state when no history
- [ ] #5 Export button on History downloads a JSON file named gym-timer-export-YYYY-MM-DD.json containing {schemaVersion, exportedAt, exercises, sets}; the serialiser is a pure function with a test; the download uses a Blob URL + anchor click and revokes the URL
- [ ] #6 The day key used by Today/History/badge is recomputed on visibilitychange (visible) and on tab switch so counts roll over at midnight; tested with a fake clock crossing midnight
- [ ] #7 Task-5 carry-over fixed: creating/typing the name of an exercise outside the recent chips moves it to the front of the chip order so it is visible and tappable; tested
- [ ] #8 Pure day/exercise grouping helpers in src/data/derive.ts with tests; src/timer/ and src/platform/ untouched; existing tests pass
- [ ] #9 npm test, npm run build and npm run format:check pass on Node 24
<!-- AC:END -->
