// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  ADD_MS,
  IDLE,
  reduce,
  remainingMs,
  type TimerAction,
  type TimerState,
} from './index.ts'

/** Fake clock advanced by hand. */
function fakeClock(start = 1_000_000) {
  let t = start
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms
    },
    set: (ms: number) => {
      t = ms
    },
  }
}

const start = (durationMs: number): TimerAction => ({
  type: 'start',
  durationMs,
})
const pause: TimerAction = { type: 'pause' }
const resume: TimerAction = { type: 'resume' }
const reset: TimerAction = { type: 'reset' }
const add30s: TimerAction = { type: 'add30s' }
const tick: TimerAction = { type: 'tick' }

/** Build one state of each status for table-driven tests. */
function sampleStates(t0: number): Record<TimerState['status'], TimerState> {
  const running = reduce(IDLE, start(60_000), t0)
  const paused = reduce(running, pause, t0 + 10_000)
  const done = reduce(running, tick, t0 + 60_000)
  return { idle: IDLE, running, paused, done }
}

describe('start', () => {
  it('idle -> running with the full duration remaining', () => {
    const c = fakeClock()
    const s = reduce(IDLE, start(90_000), c.now())
    expect(s).toEqual({
      status: 'running',
      startedAt: c.now(),
      durationMs: 90_000,
      totalMs: 90_000,
    })
    expect(remainingMs(s, c.now())).toBe(90_000)
  })

  it('throws RangeError for non-positive or non-finite durations', () => {
    for (const d of [0, -1, NaN, Infinity, -Infinity]) {
      expect(() => reduce(IDLE, start(d), 0)).toThrow(RangeError)
    }
  })
})

describe('time math', () => {
  it('counts down from the start timestamp', () => {
    const c = fakeClock()
    const s = reduce(IDLE, start(60_000), c.now())
    c.advance(1_234)
    expect(remainingMs(s, c.now())).toBe(58_766)
    c.advance(58_766)
    expect(remainingMs(s, c.now())).toBe(0)
  })

  it('stays correct after a large time jump (backgrounded tab)', () => {
    const c = fakeClock()
    let s = reduce(IDLE, start(120_000), c.now())
    c.advance(45_000) // no ticks at all while backgrounded
    expect(remainingMs(s, c.now())).toBe(75_000)
    s = reduce(s, tick, c.now())
    expect(s.status).toBe('running')

    c.advance(10 * 60 * 60 * 1000) // ten hours later
    expect(remainingMs(s, c.now())).toBe(0)
    s = reduce(s, tick, c.now())
    expect(s).toEqual({
      status: 'done',
      finishedAt: 1_000_000 + 120_000,
      totalMs: 120_000,
    })
  })

  it('clamps to the segment duration if the clock steps backwards', () => {
    const c = fakeClock()
    const s = reduce(IDLE, start(30_000), c.now())
    c.advance(-5_000)
    expect(remainingMs(s, c.now())).toBe(30_000)
  })

  it('returns 0 for idle and done', () => {
    const { idle, done } = sampleStates(0)
    expect(remainingMs(idle, 123)).toBe(0)
    expect(remainingMs(done, 123)).toBe(0)
  })
})

describe('tick', () => {
  it('keeps running (same object) while time remains', () => {
    const c = fakeClock()
    const s = reduce(IDLE, start(10_000), c.now())
    c.advance(9_999)
    expect(reduce(s, tick, c.now())).toBe(s)
  })

  it('running -> done exactly when remaining reaches 0', () => {
    const c = fakeClock()
    const s = reduce(IDLE, start(10_000), c.now())
    c.advance(10_000)
    const d = reduce(s, tick, c.now())
    expect(d).toEqual({
      status: 'done',
      finishedAt: c.now(),
      totalMs: 10_000,
    })
  })

  it('records the true finish time, not the late tick time', () => {
    const c = fakeClock()
    const s = reduce(IDLE, start(10_000), c.now())
    const due = c.now() + 10_000
    c.advance(500_000)
    const d = reduce(s, tick, c.now())
    expect(d.status === 'done' && d.finishedAt).toBe(due)
  })

  it('is a no-op in idle, paused and done', () => {
    const { idle, paused, done } = sampleStates(0)
    for (const s of [idle, paused, done]) {
      expect(reduce(s, tick, 999_999_999)).toBe(s)
    }
  })
})

describe('pause / resume', () => {
  it('pause freezes remaining time', () => {
    const c = fakeClock()
    let s = reduce(IDLE, start(60_000), c.now())
    c.advance(20_000)
    s = reduce(s, pause, c.now())
    expect(s).toEqual({
      status: 'paused',
      remainingMs: 40_000,
      totalMs: 60_000,
    })
    c.advance(3_600_000)
    expect(remainingMs(s, c.now())).toBe(40_000)
    expect(reduce(s, tick, c.now())).toBe(s)
  })

  it('resume continues from the paused remaining, not the original start', () => {
    const c = fakeClock()
    let s = reduce(IDLE, start(60_000), c.now())
    c.advance(20_000)
    s = reduce(s, pause, c.now())
    c.advance(100_000) // long pause
    s = reduce(s, resume, c.now())
    expect(s).toEqual({
      status: 'running',
      startedAt: c.now(),
      durationMs: 40_000,
      totalMs: 60_000,
    })
    expect(remainingMs(s, c.now())).toBe(40_000)
    c.advance(15_000)
    expect(remainingMs(s, c.now())).toBe(25_000)
    c.advance(25_000)
    expect(reduce(s, tick, c.now()).status).toBe('done')
  })

  it('survives several pause/resume cycles', () => {
    const c = fakeClock()
    let s = reduce(IDLE, start(30_000), c.now())
    for (let i = 0; i < 3; i++) {
      c.advance(5_000)
      s = reduce(s, pause, c.now())
      c.advance(60_000)
      s = reduce(s, resume, c.now())
    }
    expect(remainingMs(s, c.now())).toBe(15_000)
  })
})

describe('add30s', () => {
  it('adds exactly 30000 ms while running', () => {
    const c = fakeClock()
    let s = reduce(IDLE, start(60_000), c.now())
    c.advance(50_000)
    const before = remainingMs(s, c.now())
    s = reduce(s, add30s, c.now())
    expect(ADD_MS).toBe(30_000)
    expect(remainingMs(s, c.now()) - before).toBe(30_000)
    expect(s.status === 'running' && s.totalMs).toBe(90_000)
    c.advance(39_999)
    expect(reduce(s, tick, c.now()).status).toBe('running')
    c.advance(1)
    expect(reduce(s, tick, c.now()).status).toBe('done')
  })

  it('adds exactly 30000 ms while paused, and it carries into resume', () => {
    const c = fakeClock()
    let s = reduce(IDLE, start(60_000), c.now())
    c.advance(50_000)
    s = reduce(s, pause, c.now())
    s = reduce(s, add30s, c.now())
    expect(s).toEqual({
      status: 'paused',
      remainingMs: 40_000,
      totalMs: 90_000,
    })
    s = reduce(s, resume, c.now())
    expect(remainingMs(s, c.now())).toBe(40_000)
  })

  it('is a no-op in idle and done', () => {
    const { idle, done } = sampleStates(0)
    expect(reduce(idle, add30s, 0)).toBe(idle)
    expect(reduce(done, add30s, 0)).toBe(done)
  })
})

describe('reset', () => {
  it('returns to idle from every state', () => {
    const states = sampleStates(0)
    for (const s of Object.values(states)) {
      expect(reduce(s, reset, 500_000)).toEqual({ status: 'idle' })
    }
  })

  it('returns the same object from idle', () => {
    expect(reduce(IDLE, reset, 0)).toBe(IDLE)
  })
})

describe('invalid-transition policy: no-op, same object returned', () => {
  const t0 = 0
  const states = sampleStates(t0)
  const now = t0 + 20_000 // running sample still has 40s left here
  const invalid: Array<[TimerState['status'], TimerAction]> = [
    ['idle', pause],
    ['idle', resume],
    ['idle', add30s],
    ['running', start(5_000)],
    ['running', resume],
    ['paused', start(5_000)],
    ['paused', pause],
    ['done', start(5_000)],
    ['done', pause],
    ['done', resume],
    ['done', add30s],
  ]

  it.each(invalid)('%s + %o is a no-op', (status, action) => {
    const s = states[status]
    expect(reduce(s, action, now)).toBe(s)
  })

  it('settles an expired running timer to done before applying the action', () => {
    const c = fakeClock()
    const s = reduce(IDLE, start(10_000), c.now())
    c.advance(10_000)
    for (const a of [pause, add30s, resume, start(5_000), tick]) {
      expect(reduce(s, a, c.now()).status).toBe('done')
    }
    expect(reduce(s, reset, c.now())).toBe(IDLE)
  })

  it('throws RangeError for a non-finite now', () => {
    expect(() => reduce(IDLE, tick, NaN)).toThrow(RangeError)
    expect(() => remainingMs(IDLE, Infinity)).toThrow(RangeError)
  })

  it('throws for a bad duration even when start would be a no-op', () => {
    const { running } = sampleStates(0)
    expect(() => reduce(running, start(-5), 0)).toThrow(RangeError)
  })
})

describe('immutability', () => {
  it('never mutates the input state', () => {
    const c = fakeClock()
    const s = Object.freeze(reduce(IDLE, start(60_000), c.now()))
    c.advance(1_000)
    expect(() => reduce(s, add30s, c.now())).not.toThrow()
    expect(() => reduce(s, pause, c.now())).not.toThrow()
    expect(s).toEqual(reduce(IDLE, start(60_000), 1_000_000))
  })
})
