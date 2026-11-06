---
id: TASK-7
title: 'PWA: manifest, service worker, install prompt, GitHub Pages deploy'
status: In Progress
assignee: []
created_date: '2026-11-06 00:03'
updated_date: '2026-11-06 00:24'
labels:
  - pwa
  - deploy
dependencies:
  - TASK-6
priority: high
ordinal: 7
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build-order step 7 from PLAN.md. Make the app installable and deploy it to GitHub Pages. Target repo: github.com/artcar12/gym-timer (not created yet; the coordinator creates the remote and enables Pages after merge), served at https://artcar12.github.io/gym-timer/, so Vite base is /gym-timer/ in production builds and / in dev and tests (read from an env var or mode so a custom domain later is a one-line change).

PWA via vite-plugin-pwa: web app manifest (name Gym Timer, short_name Gym Timer, standalone display, portrait orientation, dark theme_color/background_color matching the app, maskable + any icons at 192 and 512 as PNG generated from a simple SVG source, plus apple-touch-icon), a precaching service worker with registerType autoUpdate, and an in-app install prompt (capture beforeinstallprompt, show an Install button/banner on the Timer screen until installed or dismissed, remember dismissal in localStorage; show nothing on browsers without the event). Service worker must not break the timer: no runtime caching of IndexedDB-related requests (none exist), and an update must not reload while a timer is running (apply the new SW on next launch, or prompt).

Deploy: a GitHub Actions workflow (.github/workflows/deploy.yml) on push to main: Node 24, npm ci, npm test, npm run build, upload dist with actions/upload-pages-artifact and deploy with actions/deploy-pages (permissions pages: write, id-token: write). A 404.html copy of index.html is not needed because the app has no path routing (hash or state only), confirm that.

Node: the shell default is Node 18 ON PURPOSE. Never change the default. Prepend $HOME/.nvm/versions/node/v24.15.0/bin to PATH per command, e.g. PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH npm test.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 vite.config.ts sets base to /gym-timer/ for production builds and / otherwise (dev, test), driven by an env var or mode with a single place to change it; npm run build output references assets under /gym-timer/ and npm run preview serves the app at http://localhost:4173/gym-timer/ working end to end
- [x] #2 vite-plugin-pwa configured with registerType autoUpdate; manifest has name, short_name, start_url and scope relative to base, display standalone, orientation portrait, theme_color and background_color matching the dark theme, icons 192 and 512 PNG (any + maskable) plus apple-touch-icon link in index.html; icons are committed under public/ and generated from a committed SVG source with a documented script
- [x] #3 Service worker precaches the built app shell and assets; the app loads offline after a first visit (verified with preview + devtools offline or an automated check of the precache manifest); IndexedDB data is untouched by the SW
- [x] #4 A service worker update never reloads the page while the timer is running or paused; the new worker is applied on next launch or via a non-blocking 'Update available' action; tested at the hook level with a fake registration
- [x] #5 Install prompt: beforeinstallprompt is captured, an Install affordance appears on the Timer screen, tapping it calls prompt(), dismissal is remembered in localStorage, nothing is shown when already installed (display-mode standalone) or when the event never fires; tested with a fake event
- [x] #6 .github/workflows/deploy.yml builds on push to main with Node 24 (npm ci, npm test, npm run build) and deploys dist via actions/upload-pages-artifact + actions/deploy-pages with the right permissions and a concurrency group; README documents enabling Pages (Source: GitHub Actions) and the live URL
- [x] #7 The service worker and manifest are excluded from Vitest/Prettier noise as needed; npm test, npm run build and npm run format:check pass on Node 24; src/timer/ untouched; existing tests pass
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Mode-driven base in vite.config.ts (PRODUCTION_BASE, VITE_BASE override).
2. vite-plugin-pwa autoUpdate with injectRegister false; manifest and precache globs.
3. public/icon.svg + scripts/icons.mjs (sharp) -> committed PNGs; index.html icons and theme-color.
4. src/pwa: useServiceWorkerUpdate (injectable register, onNeedReload, gated by timer status) and useInstallPrompt (injectable env).
5. PwaBanners on the Timer screen, wired in AppShell; registerSW passed from main.tsx.
6. Hook and screen tests with fakes; deploy workflow; README.
7. Verify test/build/format, preview at /gym-timer/, offline in headless Chrome.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Branch claude/task-7-pwa-9f6fb7.
- Base: `mode === 'production'` -> PRODUCTION_BASE '/gym-timer/' (covers both vite build and vite preview; command-based base broke preview, which runs as 'serve'), '/' for dev and Vitest; VITE_BASE overrides.
- SW updates: registerType autoUpdate (new worker skips waiting), but main.tsx passes registerSW into AppShell and useServiceWorkerUpdate supplies onNeedReload, so the plugin never calls location.reload(). The 'Update available / Reload' banner shows only while the timer is idle or done; applyUpdate re-checks current status. Otherwise the new version loads on next launch. Tests omit registerSW, so nothing registers.
- Install: useInstallPrompt(env = window) captures beforeinstallprompt (preventDefault), canInstall false when standalone (matchMedia or navigator.standalone), dismissed (localStorage key gym-timer:install-dismissed; also set when the browser dialog is declined) or event never fired; appinstalled clears it. Banner with Not now / Install (48px) on the Timer screen.
- Icons: public/icon.svg full-bleed with art in the 80% safe zone; npm run icons renders pwa-192/512 (rounded, any), maskable-192/512, apple-touch-icon 180. includeManifestIcons false and webmanifest out of globPatterns to avoid duplicate precache entries (11 entries).
- No 404.html: no path routing; navigateFallback serves index.html for in-scope paths offline anyway.
- Verified: npm test 175 passed (18 new), npm run build, npm run format:check on Node 24.15.0; npm run preview serves http://localhost:4173/gym-timer/. Offline: the Claude built-in browser pane cannot register service workers (register() fails while fetch('sw.js') is 200), so checked with headless Chrome over CDP: first visit -> SW activated, scope /gym-timer/, precache has index.html, JS, CSS, manifest and all icons; offline reload renders Timer screen with Start, controlled by SW; offline /gym-timer/anything also renders. SW has no runtime caching and does not touch IndexedDB.
- Not done: remote and Pages enablement (coordinator); the workflow has not run on GitHub yet.
<!-- SECTION:NOTES:END -->
