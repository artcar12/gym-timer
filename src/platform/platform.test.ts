import { describe, expect, it, vi } from 'vitest'
import { createWebAudio } from './audio.ts'
import { browserTimeouts } from './timeouts.ts'
import { createVibrator } from './vibrate.ts'
import { createWakeLock } from './wakeLock.ts'

const flush = () => new Promise((r) => setTimeout(r, 0))

function fakeSentinel() {
  const s = {
    released: false,
    release: vi.fn(async () => {
      s.released = true
    }),
  }
  return s
}

describe('createWakeLock', () => {
  it('requests once, releases the sentinel, and re-requests after the browser drops it', async () => {
    const sentinels: ReturnType<typeof fakeSentinel>[] = []
    const request = vi.fn(async () => {
      const s = fakeSentinel()
      sentinels.push(s)
      return s
    })
    const lock = createWakeLock({ wakeLock: { request } }, vi.fn())
    lock.acquire()
    lock.acquire() // pending: no second request
    await flush()
    lock.acquire() // held: no second request
    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith('screen')

    sentinels[0].released = true // page hidden
    lock.acquire()
    await flush()
    expect(request).toHaveBeenCalledTimes(2)

    lock.release()
    expect(sentinels[1].release).toHaveBeenCalledTimes(1)
  })

  it('releases a lock that resolves after release() was called', async () => {
    const s = fakeSentinel()
    const lock = createWakeLock(
      { wakeLock: { request: async () => s } },
      vi.fn(),
    )
    lock.acquire()
    lock.release()
    await flush()
    expect(s.release).toHaveBeenCalledTimes(1)
  })

  it('swallows failures and logs at most once', async () => {
    const log = vi.fn()
    const denied = createWakeLock(
      {
        wakeLock: {
          request: async () => {
            throw new DOMException('denied', 'NotAllowedError')
          },
        },
      },
      log,
    )
    denied.acquire()
    await flush()
    denied.acquire()
    await flush()
    expect(log).toHaveBeenCalledTimes(1)

    const throwing = createWakeLock(
      {
        wakeLock: {
          request: () => {
            throw new Error('sync')
          },
        },
      },
      log,
    )
    expect(() => throwing.acquire()).not.toThrow()

    const unsupportedLog = vi.fn()
    const unsupported = createWakeLock({}, unsupportedLog)
    unsupported.acquire()
    unsupported.acquire()
    unsupported.release()
    expect(unsupportedLog).toHaveBeenCalledTimes(1)
    expect(() => createWakeLock(undefined, vi.fn()).acquire()).not.toThrow()
  })
})

describe('createWebAudio', () => {
  it('is a no-op without AudioContext', () => {
    const audio = createWebAudio(undefined)
    expect(() => {
      audio.unlock()
      audio.beep()
      audio.stop()
    }).not.toThrow()
  })

  it('creates the context once on unlock, resumes it, and beeps through it', () => {
    const oscillators: {
      start: ReturnType<typeof vi.fn>
      stop: ReturnType<typeof vi.fn>
    }[] = []
    const param = () => ({
      value: 0,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    })
    const node = () => ({ connect: vi.fn((n: unknown) => n) })
    const instances: FakeCtx[] = []
    class FakeCtx {
      state = 'suspended'
      currentTime = 0
      sampleRate = 44_100
      destination = {}
      resume = vi.fn(async () => {
        this.state = 'running'
      })
      createBuffer = vi.fn(() => ({}))
      createBufferSource = vi.fn(() => ({
        ...node(),
        buffer: null,
        start: vi.fn(),
      }))
      createGain = vi.fn(() => ({ ...node(), gain: param() }))
      createOscillator = vi.fn(() => {
        const o = {
          ...node(),
          type: '',
          frequency: param(),
          onended: null,
          start: vi.fn(),
          stop: vi.fn(),
        }
        oscillators.push(o)
        return o
      })
      constructor() {
        instances.push(this)
      }
    }
    const audio = createWebAudio(FakeCtx as unknown as new () => AudioContext)
    audio.beep() // before unlock: silent no-op
    expect(instances).toHaveLength(0)

    audio.unlock()
    audio.unlock()
    expect(instances).toHaveLength(1)
    expect(instances[0].resume).toHaveBeenCalledTimes(1)

    audio.beep()
    expect(oscillators.length).toBeGreaterThan(0)
    audio.stop()
    for (const o of oscillators) expect(o.stop).toHaveBeenCalledTimes(2)
  })

  it('never throws if the context constructor fails', () => {
    const audio = createWebAudio(
      class {
        constructor() {
          throw new Error('nope')
        }
      } as unknown as new () => AudioContext,
    )
    expect(() => {
      audio.unlock()
      audio.beep()
    }).not.toThrow()
  })
})

describe('createVibrator', () => {
  it('forwards the pattern and cancels with 0', () => {
    const vibrate = vi.fn(() => true)
    const v = createVibrator({ vibrate })
    v.vibrate([400, 200, 300])
    v.cancel()
    expect(vibrate.mock.calls).toEqual([[[400, 200, 300]], [0]])
  })

  it('is a no-op where unsupported or throwing', () => {
    expect(() => createVibrator({} as Navigator).vibrate([1])).not.toThrow()
    expect(() => createVibrator(undefined).cancel()).not.toThrow()
    const throwing = createVibrator({
      vibrate: () => {
        throw new Error('blocked')
      },
    })
    expect(() => throwing.vibrate([1])).not.toThrow()
  })
})

describe('browserTimeouts', () => {
  it('uses the current global setTimeout', () => {
    vi.useFakeTimers()
    const cb = vi.fn()
    browserTimeouts.set(cb, 50)
    const h = browserTimeouts.set(cb, 50)
    browserTimeouts.clear(h)
    vi.advanceTimersByTime(50)
    expect(cb).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
