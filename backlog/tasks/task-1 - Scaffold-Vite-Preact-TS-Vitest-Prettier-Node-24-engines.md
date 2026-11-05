---
id: TASK-1
title: 'Scaffold: Vite + Preact + TS, Vitest, Prettier, Node 24 engines'
status: Done
assignee: []
created_date: '2026-11-05 19:41'
updated_date: '2026-11-05 19:49'
labels:
  - scaffold
dependencies: []
priority: high
ordinal: 1
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build-order step 1 from PLAN.md. Scaffold the app in the repo root: Vite + Preact + TypeScript, Vitest for unit tests, Prettier, and package.json engines pinned to Node 24. Keep it minimal: a Hello-world Preact App component, a smoke test, and npm scripts dev/build/test/format.

Node: the shell default is Node 18 ON PURPOSE (work projects). Never change the default. Prepend $HOME/.nvm/versions/node/v24.15.0/bin to PATH in each command that runs npm, node, npx, vite or vitest, e.g. PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH npm test. Vite 8 requires Node 24.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Vite + Preact + TypeScript app at repo root; dev server renders a placeholder App component
- [x] #2 package.json has engines.node pinned to 24 (e.g. "24.x" or ">=24 <25") and an .nvmrc with 24
- [x] #3 Vitest configured; npm test runs at least one passing test
- [x] #4 Prettier configured (.prettierrc + .prettierignore); npm run format runs it; code is formatted
- [x] #5 npm run build succeeds on Node 24 with no TypeScript errors (tsc --noEmit or equivalent in build)
- [x] #6 .gitignore covers node_modules and dist; node_modules is not committed
- [x] #7 A short README section documents the Node 24 PATH-prepend command
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Generate create-vite preact-ts template, keep configs, drop demo assets
2. Minimal App + main.tsx, index.html
3. Vitest (jsdom + @testing-library/preact) with smoke test, vitest config in vite.config.ts
4. Prettier config/ignore + format script; engines 24.x + .nvmrc
5. README Node 24 section; verify test/build/format
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Scaffolded from create-vite preact-ts template (Vite 8.3, Preact 11.1, TS 7.0), demo assets removed. App is a single <h1>Gym Timer</h1> in src/app.tsx. Vitest 5 configured in vite.config.ts with jsdom; smoke test src/app.test.tsx uses @testing-library/preact. Prettier: no semicolons, single quotes; .prettierignore skips backlog/, PLAN.md, CLAUDE.md, lockfile. engines.node 24.x, .nvmrc 24. build = tsc -b && vite build. Extra scripts: preview, test:watch, format:check. Verified on Node 24.15.0: npm test (1 passed), npm run build, format:check clean, dev server serves the app.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Scaffold merged to main (40328d6 + follow-up 3fce001). Reviewed clean. Vitest/Prettier/git exclude .claude worktrees.
<!-- SECTION:FINAL_SUMMARY:END -->
