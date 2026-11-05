---
id: TASK-1
title: 'Scaffold: Vite + Preact + TS, Vitest, Prettier, Node 24 engines'
status: To Do
assignee: []
created_date: '2026-11-05 19:41'
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
- [ ] #1 Vite + Preact + TypeScript app at repo root; dev server renders a placeholder App component
- [ ] #2 package.json has engines.node pinned to 24 (e.g. "24.x" or ">=24 <25") and an .nvmrc with 24
- [ ] #3 Vitest configured; npm test runs at least one passing test
- [ ] #4 Prettier configured (.prettierrc + .prettierignore); npm run format runs it; code is formatted
- [ ] #5 npm run build succeeds on Node 24 with no TypeScript errors (tsc --noEmit or equivalent in build)
- [ ] #6 .gitignore covers node_modules and dist; node_modules is not committed
- [ ] #7 A short README section documents the Node 24 PATH-prepend command
<!-- AC:END -->
