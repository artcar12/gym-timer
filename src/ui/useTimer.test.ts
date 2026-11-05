import { act, cleanup, renderHook } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTimer, type Scheduler } from './useTimer.ts'

// A frame scheduler on fake setTimeout; the clock is Date.now, faked by Vitest.
const scheduler: Scheduler = {
  request: (cb) => setTimeout(cb, 100) as unknown as number,
  cancel: (h) => clearTimeout(h),
}

function setup(initialPresetMs?: number) {
  return renderHook(() =>
    useTimer({ now: () => Date.now(), scheduler, initialPresetMs }),
  )
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(1_000_000)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useTimer', () => {
  it('idle shows the selected duration with a full ring', () => {
    const { result } = setup(90_000)
    expect(result.current.status).toBe('idle')
    expect(result.current.display).toBe('01:30')
    expect(result.current.progress).toBe(1)
  })

  it('preset tap from idle selects and starts it', () => {
    const { result } = setup()
    act(() => result.current.selectPreset(30_000))
    expect(result.current.status).toBe('running')
    expect(result.current.selectedMs).toBe(30_000)
    expect(result.current.display).toBe('00:30')

    advance(10_000)
    expect(result.current.display).toBe('00:20')
    expect(result.current.progress).toBeCloseTo(20 / 30)

    // Ceil to whole seconds: 19.9s left shows 00:20.
    advance(100)
    expect(result.current.display).toBe('00:20')
  })

  it('Start uses the selected preset', () => {
    const { result } = setup(60_000)
    act(() => result.current.start())
    expect(result.current.status).toBe('running')
    expect(result.current.display).toBe('01:00')
  })

  it('preset taps are ignored while running or paused', () => {
    const { result } = setup()
    act(() => result.current.selectPreset(60_000))
    expect(result.current.canSelectPreset).toBe(false)
    advance(5_000)
    act(() => result.current.selectPreset(30_000))
    expect(result.current.status).toBe('running')
    expect(result.current.selectedMs).toBe(60_000)
    expect(result.current.display).toBe('00:55')

    act(() => result.current.pause())
    act(() => result.current.selectPreset(30_000))
    expect(result.current.status).toBe('paused')
    expect(result.current.selectedMs).toBe(60_000)
    expect(result.current.canSelectPreset).toBe(false)

    act(() => result.current.reset())
    expect(result.current.canSelectPreset).toBe(true)
  })

  it('a preset tap at zero before the next frame still restarts', () => {
    const { result } = setup()
    act(() => result.current.selectPreset(30_000))
    vi.setSystemTime(Date.now() + 30_000) // expired, no frame has run yet
    act(() => result.current.selectPreset(90_000))
    expect(result.current.status).toBe('running')
    expect(result.current.display).toBe('01:30')
  })

  it('pause freezes the display and resume continues from it', () => {
    const { result } = setup()
    act(() => result.current.selectPreset(60_000))
    advance(15_000)
    act(() => result.current.pause())
    expect(result.current.status).toBe('paused')
    expect(result.current.display).toBe('00:45')

    advance(30_000)
    expect(result.current.display).toBe('00:45')

    act(() => result.current.resume())
    expect(result.current.status).toBe('running')
    advance(5_000)
    expect(result.current.display).toBe('00:40')
  })

  it('+30s adds time while running and while paused', () => {
    const { result } = setup()
    act(() => result.current.selectPreset(30_000))
    advance(10_000)
    act(() => result.current.add30s())
    expect(result.current.display).toBe('00:50')
    expect(result.current.progress).toBeCloseTo(50 / 60)

    act(() => result.current.pause())
    act(() => result.current.add30s())
    expect(result.current.display).toBe('01:20')
    expect(result.current.state).toMatchObject({ totalMs: 90_000 })
  })

  it('reaches done at zero and stops scheduling once dismissed', () => {
    const { result } = setup()
    act(() => result.current.selectPreset(30_000))
    advance(29_900)
    expect(result.current.status).toBe('running')
    expect(result.current.display).toBe('00:01')

    advance(200)
    expect(result.current.status).toBe('done')
    expect(result.current.display).toBe('00:00')
    expect(result.current.progress).toBe(0)
    // Only the alarm repeat is pending; frames and done detection stopped.
    expect(result.current.alarming).toBe(true)
    expect(vi.getTimerCount()).toBe(1)
    act(() => result.current.dismiss())
    expect(result.current.status).toBe('done')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('computes from the clock, not from frames: a frozen loop still lands right', () => {
    const { result } = setup()
    act(() => result.current.selectPreset(60_000))
    // Clock jumps 40s without any frames firing (backgrounded tab).
    vi.setSystemTime(Date.now() + 40_000)
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current.display).toBe('00:20')

    vi.setSystemTime(Date.now() + 60_000)
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current.status).toBe('done')
  })

  it('preset tap after done resets and starts', () => {
    const { result } = setup()
    act(() => result.current.selectPreset(30_000))
    advance(31_000)
    expect(result.current.status).toBe('done')
    expect(result.current.canSelectPreset).toBe(true)

    act(() => result.current.selectPreset(90_000))
    expect(result.current.status).toBe('running')
    expect(result.current.display).toBe('01:30')
  })

  it('reset returns to idle from running, paused and done', () => {
    const { result } = setup(60_000)
    act(() => result.current.start())
    act(() => result.current.reset())
    expect(result.current.status).toBe('idle')
    expect(result.current.display).toBe('01:00')

    act(() => result.current.start())
    act(() => result.current.pause())
    act(() => result.current.reset())
    expect(result.current.status).toBe('idle')

    act(() => result.current.start())
    advance(61_000)
    expect(result.current.status).toBe('done')
    act(() => result.current.reset())
    expect(result.current.status).toBe('idle')
    expect(vi.getTimerCount()).toBe(0)
  })
})
