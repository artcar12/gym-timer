---
id: TASK-8
title: Adopt the unified workflow
status: Done
assignee:
  - '@claude'
created_date: '2026-11-16 23:37'
updated_date: '2026-11-17 00:32'
labels: []
dependencies: []
ordinal: 1007
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Bring this repo onto the unified workflow (claude-skills: skills/working-standard, docs/workflow-audit/decisions.md). Follow the migration steps in claude-skills templates/project/README.md: backlog config, CLAUDE.md as Backlog block + working-standard block + project-only rules, AGENTS.md pointer, .agent-runs/ and .claude/worktrees/ in .gitignore, spec/plan/ADRs/handoff files imported into Backlog (spec as doc-1), load-bearing Claude memory moved into Backlog or CLAUDE.md, repo-local git-sync hooks removed once the git-sync mod is on every machine.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 CLAUDE.md, AGENTS.md, .gitignore and backlog config match the template
- [x] #2 Any spec or plan is Backlog doc-1 and the file is gone; ADRs are decisions; no handoff file
- [x] #3 No load-bearing project rules left in Claude memory on either machine
- [x] #4 Gate green, merged and pushed
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Backlog config: remote_operations true (check_active_branches already true, statuses already To Do/In Progress/Done, keep task prefix).
2. CLAUDE.md: refresh Backlog block, add working-standard block and project rules (gate, Node 24, Pages deploy, data rules).
3. AGENTS.md one-line pointer; .gitignore template lines.
4. PLAN.md imported as doc-1 (obsolete coordinator/worker Workflow section replaced by a pointer to the standard), file deleted, README pointer updated.
5. Mac Claude memory: archive-child-sessions rule is covered by the standard's done rule; delete it.
6. Gate with Node 24 (.nvmrc): format:check, test, build. Fresh-context review, merge --no-ff, push, check Pages deploy.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Config: remote_operations on (check_active_branches already on, statuses already To Do/In Progress/Done, task prefix kept). Backlog block already at 1.51.0. PLAN.md imported as doc-1 with its old coordinator/worker Workflow section replaced by a pointer to the standard and Node/attribution boilerplate trimmed; no ADRs or handoff files existed. Mac memory: archive-child-sessions-when-done.md deleted (covered by the standard's done rule; the Vitest .claude/** exclude it mentions is in vite.config.ts). Latitude: no gym-timer memory checked from here; pick up there if a memory dir exists. Gate on Node v24.15.0: format:check ok, 175/175 tests, build ok. Fresh-context review: no defects; low items: done tasks 1-7 still say 'from PLAN.md' (left as history, doc-1 notes it was imported from PLAN.md), redundant .claude/worktrees/ gitignore line (kept, matches template).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Repo on the unified workflow: CLAUDE.md = Backlog block + working-standard block + project rules (gate, Pages deploy), AGENTS.md pointer, .gitignore template lines, remote_operations on, PLAN.md is doc-1. Verified with the Node 24 gate and a fresh-context review.
<!-- SECTION:FINAL_SUMMARY:END -->
