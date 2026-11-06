/// <reference types="vitest/config" />
import preact from '@preact/preset-vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { configDefaults } from 'vitest/config'

/**
 * Public path of production builds: the GitHub Pages project URL
 * https://artcar12.github.io/gym-timer/. For a custom domain served at the
 * root, change this to '/' (or set VITE_BASE=/ for a one-off build).
 */
const PRODUCTION_BASE = '/gym-timer/'

/** Dark surface colour from src/styles/app.css (--surface). */
const THEME_COLOR = '#111318'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // `vite build` and `vite preview` run in production mode at the Pages path;
  // the dev server (development) and Vitest (test) run at '/'.
  base:
    process.env.VITE_BASE ?? (mode === 'production' ? PRODUCTION_BASE : '/'),
  plugins: [
    preact(),
    VitePWA({
      // The new worker skips waiting and takes control as soon as it installs,
      // but the page is never reloaded for it: src/pwa/useServiceWorkerUpdate.ts
      // passes onNeedReload, so the update shows on the next launch or through
      // an "Update available" action while the timer is idle or done.
      registerType: 'autoUpdate',
      // Registration happens from src/main.tsx through virtual:pwa-register.
      injectRegister: false,
      // globPatterns below already picks up public/ icons; don't list them twice.
      includeManifestIcons: false,
      manifest: {
        id: '.',
        name: 'Gym Timer',
        short_name: 'Gym Timer',
        description: 'Rest timer that counts your sets per exercise.',
        // Relative to the manifest, which is served at the base path.
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: THEME_COLOR,
        background_color: THEME_COLOR,
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App shell, code, styles and icons. No runtime caching: the app makes
        // no network requests of its own and IndexedDB never goes through the SW.
        globPatterns: ['**/*.{html,js,css,svg,png}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    // Claude Desktop puts session worktrees under .claude/worktrees/ inside the repo.
    exclude: [...configDefaults.exclude, '**/.claude/**'],
  },
}))
