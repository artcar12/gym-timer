// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { IDLE, createTimer, reduce, remainingMs } from './index.ts'

describe('createTimer', () => {
  it('drives the pure core from the injected clock', () => {
    let t = 0
    const timer = createTimer(() => t)
    expect(timer.state.status).toBe('idle')

    timer.start(60_000)
    t += 20_000
    expect(timer.remaining()).toBe(40_000)

    timer.pause()
    t += 99_000
    expect(timer.remaining()).toBe(40_000)

    timer.add30s()
    timer.resume()
    expect(timer.remaining()).toBe(70_000)

    t += 70_000
    expect(timer.tick().status).toBe('done')
    expect(timer.reset()).toEqual({ status: 'idle' })
  })

  it('restores a saved running state and keeps counting from the clock', () => {
    const saved = reduce(IDLE, { type: 'start', durationMs: 90_000 }, 1_000)
    let t = 31_000 // 30s elapsed while the page was closed
    const timer = createTimer(() => t, saved)
    expect(timer.state).toBe(saved)
    expect(timer.remaining()).toBe(60_000)
    expect(remainingMs(timer.state, t)).toBe(60_000)
    t += 15_000
    expect(remainingMs(timer.state, t)).toBe(45_000)
    expect(timer.tick().status).toBe('running')
  })

  it('restores a state that expired while saved and settles it on tick', () => {
    const saved = reduce(IDLE, { type: 'start', durationMs: 60_000 }, 1_000)
    const timer = createTimer(() => 1_000 + 3_600_000, saved)
    expect(timer.remaining()).toBe(0)
    expect(timer.tick()).toEqual({
      status: 'done',
      finishedAt: 61_000,
      totalMs: 60_000,
    })
  })

  it('dispatch returns the same state for an invalid transition', () => {
    const timer = createTimer(() => 0)
    const s = timer.state
    expect(timer.dispatch({ type: 'pause' })).toBe(s)
  })
})
