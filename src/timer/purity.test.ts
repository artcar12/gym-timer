// @vitest-environment node
import { expect, it } from 'vitest'

// Raw source of every non-test module in src/timer.
const sources = import.meta.glob<string>(['./*.ts', '!./*.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

const FORBIDDEN = [
  /\bwindow\b/,
  /\bdocument\b/,
  /\bnavigator\b/,
  /\bglobalThis\b/,
  /\bDate\b/,
  /\bperformance\b/,
  /\bsetTimeout\b/,
  /\bsetInterval\b/,
  /\brequestAnimationFrame\b/,
  /\bpreact\b/,
]

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

it('found the timer modules', () => {
  expect(Object.keys(sources).sort()).toEqual([
    './createTimer.ts',
    './index.ts',
    './timer.ts',
  ])
})

it.each(Object.entries(sources))(
  '%s uses no DOM, clock or timer globals',
  (_, src) => {
    const code = stripComments(src)
    for (const re of FORBIDDEN) expect(code).not.toMatch(re)
  },
)
