---
id: TASK-6
title: 'Today and History screens, JSON export, bottom navigation'
status: Done
assignee: []
created_date: '2026-11-05 23:35'
updated_date: '2026-11-05 23:53'
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
- [x] #1 Bottom tab bar with Timer, Today, History; 48px targets; active tab highlighted; works at 360px without horizontal scroll
- [x] #2 Switching tabs never resets, pauses or stops the timer: the timer and workout state live above the tab switch; a running timer keeps counting and reaches done (with alarm) while on another tab; tests prove the timer state survives a tab switch
- [x] #3 Today screen lists exercises with at least one set today, most sets first, with the day total; empty state when no sets; counts update live after recording a set on the Timer tab and after +1/-1
- [x] #4 History screen lists previous days newest first (today excluded), each with date label and total sets, expandable to per-exercise counts; empty state when no history
- [x] #5 Export button on History downloads a JSON file named gym-timer-export-YYYY-MM-DD.json containing {schemaVersion, exportedAt, exercises, sets}; the serialiser is a pure function with a test; the download uses a Blob URL + anchor click and revokes the URL
- [x] #6 The day key used by Today/History/badge is recomputed on visibilitychange (visible) and on tab switch so counts roll over at midnight; tested with a fake clock crossing midnight
- [x] #7 Task-5 carry-over fixed: creating/typing the name of an exercise outside the recent chips moves it to the front of the chip order so it is visible and tappable; tested
- [x] #8 Pure day/exercise grouping helpers in src/data/derive.ts with tests; src/timer/ and src/platform/ untouched; existing tests pass
- [x] #9 npm test, npm run build and npm run format:check pass on Node 24
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Pure helpers in src/data/derive.ts (groupSetsByDay, exerciseCounts, daySummaries) and a pure export serialiser in src/data/export.ts, with tests.
2. useWorkout: expose sets/exercises/today, refreshDay(); recompute day on visibilitychange, tab switch, record/remove; create() moves an off-chip existing exercise to the front of order.
3. AppShell owns useTimer + useWorkout + active tab; TimerScreen becomes a view (kept mounted, hidden); Today/History mount on demand; TabBar with live mm:ss badge on Timer tab.
4. TodayScreen, HistoryScreen (expandable days, Export via Blob URL + anchor, revoke).
5. Tests: tab switch keeps timer running to done; midnight rollover; create fix; screens; export download. Check 360px in browser.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
State lifted: src/ui/AppShell.tsx owns useWorkout, useTimer and the active tab (plain state, no hash). TimerScreen is now a view ({timer, workout}) and stays mounted but hidden on other tabs, so its local UI state (remembered custom time chip, open inputs) also survives; Today/History mount on demand. TabBar (M3 navigation bar, 120x80 targets at 360px) shows a badge on the Timer tab while elsewhere: live mm:ss when running/paused, Done (pulsing while alarming) when finished.
Data: derive.ts gains groupSetsByDay, exerciseCounts, daySummaries (+ UNKNOWN_EXERCISE placeholder); export.ts has pure buildExport/serializeExport/exportFileName (sorted for deterministic output). ui/download.ts does Blob URL + hidden anchor click, revokes on the next task. Screens derive from workout.sets/exercises (no re-query), memoised on [sets, exercises, today] since the shell re-renders per frame while running.
useWorkout: exposes exercises, sets, today, refreshDay(); today is recomputed on load, visibilitychange (visible), tab switch, recordSet and removeLatestToday (so a set after midnight counts at once). create() with an existing name outside the first RECENT_LIMIT ids of order moves it to the front (also when it is already selected).
Tests: src/ui/shell.test.tsx (tab switch keeps timer running to done with alarm, paused stays paused, Today/History/export, midnight via tab switch and visibilitychange), useWorkout.test.ts (rollover, hidden ignored, create fix), derive/export/format tests. 155 tests pass; build and format:check pass on Node 24. Checked at 360px in the browser: no horizontal scroll, no console errors.
Not done: a stored selection outside the top 6 at load still has no chip (same class of bug as the create nit, left out of scope).

Review nits: Blob URL revoked after 1000 ms (WebKit can cancel an immediately revoked download); a stored selection outside the first RECENT_LIMIT chips is moved to the front at load (shared withChip helper with create). 157 tests pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Today and History screens, JSON export, bottom tab bar with state lifted into AppShell merged to main (6d9682b + review fixes 4f0f548). Reviewed clean, hand-tested at 360px. 157 tests, build and format clean.
<!-- SECTION:FINAL_SUMMARY:END -->
