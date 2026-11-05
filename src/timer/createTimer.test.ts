// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createTimer } from './index.ts'

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

  it('dispatch returns the same state for an invalid transition', () => {
    const timer = createTimer(() => 0)
    const s = timer.state
    expect(timer.dispatch({ type: 'pause' })).toBe(s)
  })
})
