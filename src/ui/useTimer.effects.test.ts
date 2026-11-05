import { act, cleanup, renderHook } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  AlarmAudio,
  Timeouts,
  Vibrator,
  WakeLock,
} from '../platform/index.ts'
import {
  ALARM_PERIOD_MS,
  VIBRATE_PATTERN,
  useTimer,
  type Scheduler,
} from './useTimer.ts'

// Frames never fire: proves done detection does not depend on the frame loop
// (as in a hidden tab).
const frozenFrames: Scheduler = { request: () => 0, cancel: () => {} }

function fakes() {
  const wakeLock = { acquire: vi.fn(), release: vi.fn() } satisfies WakeLock
  const audio = {
    unlock: vi.fn(),
    beep: vi.fn(),
    stop: vi.fn(),
  } satisfies AlarmAudio
  const vibrator = { vibrate: vi.fn(), cancel: vi.fn() } satisfies Vibrator
  // Real (Vitest-faked) timeouts, recorded so arm/clear can be asserted.
  const timeouts = {
    set: vi.fn(
      (cb: () => void, ms: number) => setTimeout(cb, ms) as unknown as number,
    ),
    clear: vi.fn((h: number) => clearTimeout(h)),
  } satisfies Timeouts
  return { wakeLock, audio, vibrator, timeouts }
}

function setup(f = fakes()) {
  const hook = renderHook(() =>
    useTimer({
      now: () => Date.now(),
      scheduler: frozenFrames,
      initialPresetMs: 60_000,
      ...f,
    }),
  )
  return { ...hook, ...f }
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

let visibility: DocumentVisibilityState = 'visible'
function setVisibility(v: DocumentVisibilityState) {
  visibility = v
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(1_000_000)
  visibility = 'visible'
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(
    () => visibility,
  )
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('done detection timeout', () => {
  it('is armed with the remaining ms on start and fires done without frames', () => {
    const { result, timeouts } = setup()
    act(() => result.current.start())
    expect(timeouts.set).toHaveBeenLastCalledWith(expect.any(Function), 60_000)

    advance(59_999)
    expect(result.current.status).toBe('running')
    advance(1)
    expect(result.current.status).toBe('done')
  })

  it('is cleared on pause and re-armed with the rest on resume', () => {
    const { result, timeouts } = setup()
    act(() => result.current.start())
    const armed = timeouts.set.mock.results.at(-1)!.value
    advance(20_000)
    act(() => result.current.pause())
    expect(timeouts.clear).toHaveBeenCalledWith(armed)

    advance(120_000) // paused: nothing fires
    expect(result.current.status).toBe('paused')

    act(() => result.current.resume())
    expect(timeouts.set).toHaveBeenLastCalledWith(expect.any(Function), 40_000)
    advance(40_000)
    expect(result.current.status).toBe('done')
  })

  it('is re-armed after +30s, so the old deadline does not end the run', () => {
    const { result, timeouts } = setup()
    act(() => result.current.start())
    const armed = timeouts.set.mock.results.at(-1)!.value
    advance(50_000)
    act(() => result.current.add30s())
    expect(timeouts.clear).toHaveBeenCalledWith(armed)
    expect(timeouts.set).toHaveBeenLastCalledWith(expect.any(Function), 40_000)

    advance(10_000) // original deadline
    expect(result.current.status).toBe('running')
    advance(30_000)
    expect(result.current.status).toBe('done')
  })

  it('is cleared on reset and on unmount', () => {
    const { result, timeouts, unmount } = setup()
    act(() => result.current.start())
    act(() => result.current.reset())
    expect(timeouts.clear).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)

    act(() => result.current.start())
    act(() => unmount())
    expect(timeouts.clear).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('re-arms if it fires early against the clock', () => {
    const { result, timeouts } = setup()
    act(() => result.current.start())
    const fire = timeouts.set.mock.calls.at(-1)![0]
    vi.setSystemTime(Date.now() + 59_990) // fired 10ms early
    act(() => fire())
    expect(result.current.status).toBe('running')
    expect(timeouts.set).toHaveBeenLastCalledWith(fire, 10)
  })

  it('a timer that expires while hidden shows done and alarms on becoming visible', () => {
    // Hidden tab: timeouts are throttled and never fire here.
    const f = fakes()
    f.timeouts.set.mockImplementation(() => 1)
    const { result, audio } = setup(f)
    act(() => result.current.start())
    setVisibility('hidden')
    vi.setSystemTime(Date.now() + 90_000)
    expect(result.current.status).toBe('running')

    setVisibility('visible')
    expect(result.current.status).toBe('done')
    expect(result.current.alarming).toBe(true)
    expect(audio.beep).toHaveBeenCalledTimes(1)
  })
})

describe('wake lock', () => {
  it('is acquired on running and released on pause, done, reset and unmount', () => {
    const { result, wakeLock, unmount } = setup()
    act(() => result.current.start())
    expect(wakeLock.acquire).toHaveBeenCalledTimes(1)

    act(() => result.current.add30s()) // still running: no churn
    expect(wakeLock.acquire).toHaveBeenCalledTimes(1)
    expect(wakeLock.release).toHaveBeenCalledTimes(0)

    act(() => result.current.pause())
    expect(wakeLock.release).toHaveBeenCalledTimes(1)

    act(() => result.current.resume())
    expect(wakeLock.acquire).toHaveBeenCalledTimes(2)
    advance(90_000)
    expect(result.current.status).toBe('done')
    expect(wakeLock.release).toHaveBeenCalledTimes(2)

    act(() => result.current.selectPreset(30_000))
    expect(wakeLock.acquire).toHaveBeenCalledTimes(3)
    act(() => result.current.reset())
    expect(wakeLock.release).toHaveBeenCalledTimes(3)

    act(() => result.current.start())
    act(() => unmount())
    expect(wakeLock.release).toHaveBeenCalledTimes(4)
  })

  it('is re-requested when the page becomes visible while running only', () => {
    const { result, wakeLock } = setup()
    act(() => result.current.start())
    setVisibility('hidden')
    expect(wakeLock.acquire).toHaveBeenCalledTimes(1)
    setVisibility('visible')
    expect(wakeLock.acquire).toHaveBeenCalledTimes(2)

    act(() => result.current.pause())
    setVisibility('hidden')
    setVisibility('visible')
    expect(wakeLock.acquire).toHaveBeenCalledTimes(2)
  })
})

describe('audio unlock', () => {
  it('runs synchronously in Start, Resume and every preset tap', () => {
    const { result, audio } = setup()
    // Each assertion runs inside the handler's call stack, before any render
    // or effect, as a click handler would.
    act(() => {
      result.current.start()
      expect(audio.unlock).toHaveBeenCalledTimes(1)
    })
    act(() => result.current.pause())
    act(() => {
      result.current.resume()
      expect(audio.unlock).toHaveBeenCalledTimes(2)
    })
    // An ignored preset tap while running still unlocks (cheap, idempotent).
    act(() => {
      result.current.selectPreset(30_000)
      expect(audio.unlock).toHaveBeenCalledTimes(3)
    })
    act(() => result.current.reset())
    act(() => {
      result.current.selectPreset(30_000)
      expect(audio.unlock).toHaveBeenCalledTimes(4)
    })
    expect(result.current.status).toBe('running')
    expect(audio.beep).not.toHaveBeenCalled()
  })
})

describe('start', () => {
  it('computes the next state outside the updater, so the same tick sees running', () => {
    const { result } = setup()
    act(() => {
      result.current.start()
      // stateRef already holds running: this preset tap is ignored rather
      // than starting a second timer from a stale idle state.
      result.current.selectPreset(30_000)
    })
    expect(result.current.status).toBe('running')
    expect(result.current.selectedMs).toBe(60_000)
    expect(result.current.display).toBe('01:00')
  })
})

describe('alarm', () => {
  function toDone() {
    const s = setup()
    act(() => s.result.current.selectPreset(30_000))
    advance(30_000)
    expect(s.result.current.status).toBe('done')
    return s
  }

  it('beeps and vibrates at done and repeats every period', () => {
    const { result, audio, vibrator } = toDone()
    expect(result.current.alarming).toBe(true)
    expect(audio.beep).toHaveBeenCalledTimes(1)
    expect(vibrator.vibrate).toHaveBeenCalledWith(VIBRATE_PATTERN)

    advance(ALARM_PERIOD_MS * 3)
    expect(audio.beep).toHaveBeenCalledTimes(4)
    expect(vibrator.vibrate).toHaveBeenCalledTimes(4)
  })

  it('stops on dial dismiss, staying done', () => {
    const { result, audio, vibrator } = toDone()
    act(() => result.current.dismiss())
    expect(result.current.status).toBe('done')
    expect(result.current.alarming).toBe(false)
    expect(audio.stop).toHaveBeenCalledTimes(1)
    expect(vibrator.cancel).toHaveBeenCalledTimes(1)
    advance(ALARM_PERIOD_MS * 5)
    expect(audio.beep).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('stops on Reset, returning to idle', () => {
    const { result, audio, vibrator } = toDone()
    act(() => result.current.reset())
    expect(result.current.status).toBe('idle')
    expect(result.current.alarming).toBe(false)
    expect(audio.stop).toHaveBeenCalledTimes(1)
    expect(vibrator.cancel).toHaveBeenCalledTimes(1)
    advance(ALARM_PERIOD_MS * 5)
    expect(audio.beep).toHaveBeenCalledTimes(1)
  })

  it('stops on a preset tap, which starts the new timer', () => {
    const { result, audio, vibrator } = toDone()
    act(() => result.current.selectPreset(90_000))
    expect(result.current.status).toBe('running')
    expect(result.current.display).toBe('01:30')
    expect(result.current.alarming).toBe(false)
    expect(audio.stop).toHaveBeenCalledTimes(1)
    expect(vibrator.cancel).toHaveBeenCalledTimes(1)
    advance(ALARM_PERIOD_MS * 5)
    expect(audio.beep).toHaveBeenCalledTimes(1)
  })

  it('rings again for the next done after a dismiss', () => {
    const { result, audio } = toDone()
    act(() => result.current.dismiss())
    act(() => result.current.selectPreset(30_000))
    advance(30_000)
    expect(result.current.alarming).toBe(true)
    expect(audio.beep).toHaveBeenCalledTimes(2)
  })

  it('stops on unmount', () => {
    const { audio, vibrator, unmount } = toDone()
    act(() => unmount())
    expect(audio.stop).toHaveBeenCalledTimes(1)
    expect(vibrator.cancel).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })
})
