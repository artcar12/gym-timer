/// <reference types="vitest/config" />
import preact from '@preact/preset-vite'
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [preact()],
  test: {
    environment: 'jsdom',
    // Claude Desktop puts session worktrees under .claude/worktrees/ inside the repo.
    exclude: [...configDefaults.exclude, '**/.claude/**'],
  },
})
