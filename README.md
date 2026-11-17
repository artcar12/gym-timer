# gym-timer

Mobile-first rest timer for gym workouts that also counts sets per exercise per day. No backend;
all data stays on the device. The spec (decisions, behaviour, build order) is Backlog doc-1: `backlog doc view doc-1`.

## Node 24

This project needs Node 24 (Vite 8). The shell default Node is 18 on purpose for other projects,
so do not change it or run `nvm use`. Instead, prepend the Node 24 bin directory to `PATH` in each
command:

```bash
PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH npm install
PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH npm run dev
PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH npm test
PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH npm run build
PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH npm run format
```

Use whichever `v24.x` directory exists under `~/.nvm/versions/node/`.

## Install as an app (PWA)

The production build is an installable PWA (`vite-plugin-pwa`): a web app manifest, icons and a
service worker that precaches the whole app, so it works offline after the first visit. All data
stays in IndexedDB on the device; the service worker never touches it.

- Chrome / Edge on Android and desktop: an **Install** banner appears on the Timer screen. "Not
  now" hides it for good on that device (remembered in `localStorage`).
- iOS Safari: Share, then **Add to Home Screen** (Safari has no install event, so no banner).

Updates: a new version activates in the background but never reloads the page by itself. It
shows on the next launch, or tap **Reload** on the "Update available" banner, which only appears
while the timer is idle or done (never while it is running or paused).

### Icons

`public/icon.svg` is the source. The PNGs next to it (`pwa-192.png`, `pwa-512.png`,
`maskable-192.png`, `maskable-512.png`, `apple-touch-icon.png`) are generated with `sharp` and
committed. After editing the SVG, regenerate them and commit the result:

```bash
PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH npm run icons
```

Keep the artwork inside the central 80% circle so the maskable icons are not clipped.

## Deploy (GitHub Pages)

Live at **https://artcar12.github.io/gym-timer/**.

`.github/workflows/deploy.yml` runs on every push to `main` (and on demand): `npm ci`, `npm test`,
`npm run build`, then publishes `dist/` with `actions/deploy-pages`.

One-time setup on GitHub: **Settings > Pages > Build and deployment > Source: GitHub Actions**.

Base path: production builds are served from `/gym-timer/`, the dev server and tests from `/`.
This is `PRODUCTION_BASE` in `vite.config.ts`; for a custom domain at the root, change it to `/`
(or build once with `VITE_BASE=/`). No `404.html` is needed: the app has no path routing, screens
are component state, so every visit loads `index.html` at the base path.

Check a production build locally:

```bash
PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH npm run build
PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH npm run preview
```

then open http://localhost:4173/gym-timer/.
