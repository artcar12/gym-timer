
<!-- BACKLOG.MD GUIDELINES START -->
<!-- backlog.md-instructions-version: 1.51.0 -->
<CRITICAL_INSTRUCTION>

## Backlog.md Workflow

This project uses Backlog.md for task and project management.

**At the beginning of each conversation in this project, run `backlog instructions overview` before answering or taking action. Re-read it only if you have not read it yet in the current conversation.**

Use the overview to decide whether to search, read, create, or update Backlog tasks.

Before task lifecycle actions, read the matching detailed guide:
- `backlog instructions task-creation` before creating or splitting tasks
- `backlog instructions task-execution` before planning, changing status or assignee, adding a plan or implementation notes, or implementing task work
- `backlog instructions task-finalization` before checking acceptance criteria, writing final summaries, or moving tasks to terminal statuses

Use `backlog <command> --help` before running unfamiliar commands. Help shows options, fields, and examples.

Do not edit Backlog task, draft, document, decision, or milestone markdown files directly. Use the `backlog` CLI so metadata, relationships, and history stay consistent.

</CRITICAL_INSTRUCTION>
<!-- BACKLOG.MD GUIDELINES END -->

<!-- working-standard START -->
## Working method

Arthur's `working-standard` skill applies to every session in this project. It's manual-only, so read `~/.claude/skills/working-standard/SKILL.md` at session start (and `references/lifecycle.md` for phase work) unless he has run `/working-standard`.
<!-- working-standard END -->

## Project rules

Mobile-first rest timer PWA (Vite + Preact + TypeScript) that counts sets per exercise per day. Backlog doc-1 is the spec.

Gate (all must pass before a merge; Node 24 per `.nvmrc`):

```bash
npm run format:check
npm test
npm run build
```

- Deploy: every push to `main` runs `.github/workflows/deploy.yml` (test, build, publish `dist/` to GitHub Pages at https://artcar12.github.io/gym-timer/). A push to `main` is not done until that run is green. Production base path is `/gym-timer/` (`PRODUCTION_BASE` in `vite.config.ts`).
- No backend: all data stays in IndexedDB on the device; the service worker never touches it.
- Icons: `public/icon.svg` is the source; after editing it run `npm run icons` and commit the regenerated PNGs.
