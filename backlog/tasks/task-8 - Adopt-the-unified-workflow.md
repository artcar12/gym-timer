---
id: TASK-8
title: Adopt the unified workflow
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-16 23:37'
updated_date: '2026-11-17 00:26'
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
- [ ] #1 CLAUDE.md, AGENTS.md, .gitignore and backlog config match the template
- [ ] #2 Any spec or plan is Backlog doc-1 and the file is gone; ADRs are decisions; no handoff file
- [ ] #3 No load-bearing project rules left in Claude memory on either machine
- [ ] #4 Gate green, merged and pushed
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
