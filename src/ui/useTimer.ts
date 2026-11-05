import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import {
  IDLE,
  reduce,
  remainingMs,
  type Clock,
  type TimerAction,
  type TimerState,
} from '../timer/index.ts'
import { formatMs } from './format.ts'

/**
 * Schedules a callback for the next frame. Only used to trigger re-renders and
 * `tick`; elapsed time always comes from the clock, never from counting calls.
 */
export interface Scheduler {
  request(cb: () => void): number
  cancel(handle: number): void
}

/** requestAnimationFrame, falling back to a short timeout outside browsers. */
export const frameScheduler: Scheduler =
  typeof requestAnimationFrame === 'function'
    ? {
        request: (cb) => requestAnimationFrame(cb),
        cancel: (h) => cancelAnimationFrame(h),
      }
    : {
        request: (cb) => setTimeout(cb, 100) as unknown as number,
        cancel: (h) => clearTimeout(h),
      }

export const PRESETS_MS = [30_000, 60_000, 90_000, 120_000] as const

export interface UseTimerOptions {
  /** Clock in ms. Defaults to `Date.now` (safe to persist, unlike performance.now). */
  now?: Clock
  /** Frame scheduler. Must be a stable reference. Defaults to rAF. */
  scheduler?: Scheduler
  /** Preset selected before the user picks one. */
  initialPresetMs?: number
}

export interface TimerView {
  state: TimerState
  status: TimerState['status']
  /** Duration a Start or preset tap will use. */
  selectedMs: number
  /** Remaining ms now; for idle, the selected duration. */
  remaining: number
  /** `mm:ss` of `remaining`, ceiling to whole seconds. */
  display: string
  /** 0..1 fraction of the ring to draw: remaining / totalMs. */
  progress: number
  /** Preset taps are accepted only when idle or done. */
  canSelectPreset: boolean
  /**
   * Idle or done: select `ms` and start it (done is reset first).
   * Running or paused: ignored, so the highlighted chip keeps matching the dial.
   */
  selectPreset(ms: number): void
  start(): void
  pause(): void
  resume(): void
  reset(): void
  add30s(): void
}

const TICK: TimerAction = { type: 'tick' }

export function useTimer(options: UseTimerOptions = {}): TimerView {
  const {
    now = Date.now,
    scheduler = frameScheduler,
    initialPresetMs = 60_000,
  } = options
  const nowRef = useRef(now)
  nowRef.current = now

  const [state, setState] = useState<TimerState>(IDLE)
  const [selectedMs, setSelectedMs] = useState(initialPresetMs)
  // Bumped to force a render when the state object is unchanged but time moved.
  const [, setFrame] = useState(0)

  const dispatch = useCallback((action: TimerAction) => {
    setState((s) => reduce(s, action, nowRef.current()))
  }, [])

  const recompute = useCallback(() => {
    dispatch(TICK)
    setFrame((f) => f + 1)
  }, [dispatch])

  // Frame loop, only while running: tick (so running can become done) and re-render.
  const running = state.status === 'running'
  useEffect(() => {
    if (!running) return
    let handle = 0
    const loop = () => {
      recompute()
      handle = scheduler.request(loop)
    }
    handle = scheduler.request(loop)
    return () => scheduler.cancel(handle)
  }, [running, scheduler, recompute])

  // Background tabs throttle frames; recompute as soon as the page is visible again.
  useEffect(() => {
    document.addEventListener('visibilitychange', recompute)
    return () => document.removeEventListener('visibilitychange', recompute)
  }, [recompute])

  const stateRef = useRef(state)
  stateRef.current = state

  const selectPreset = useCallback((ms: number) => {
    const t = nowRef.current()
    // Settle an expired run first, so a tap at 00:00 before the next frame counts.
    const settled = reduce(stateRef.current, TICK, t)
    if (settled.status === 'running' || settled.status === 'paused') return
    let next =
      settled.status === 'done'
        ? reduce(settled, { type: 'reset' }, t)
        : settled
    next = reduce(next, { type: 'start', durationMs: ms }, t)
    stateRef.current = next
    setSelectedMs(ms)
    setState(next)
  }, [])

  const start = useCallback(
    () => dispatch({ type: 'start', durationMs: selectedMs }),
    [dispatch, selectedMs],
  )
  const pause = useCallback(() => dispatch({ type: 'pause' }), [dispatch])
  const resume = useCallback(() => dispatch({ type: 'resume' }), [dispatch])
  const reset = useCallback(() => dispatch({ type: 'reset' }), [dispatch])
  const add30s = useCallback(() => dispatch({ type: 'add30s' }), [dispatch])

  // Derived on every render from the clock; nothing here is accumulated.
  let remaining: number
  let progress: number
  if (state.status === 'idle') {
    remaining = selectedMs
    progress = 1
  } else {
    remaining = remainingMs(state, now())
    progress = state.totalMs > 0 ? remaining / state.totalMs : 0
  }

  return {
    state,
    status: state.status,
    selectedMs,
    remaining,
    display: formatMs(remaining),
    progress,
    canSelectPreset:
      state.status === 'idle' ||
      state.status === 'done' ||
      (state.status === 'running' && remaining === 0),
    selectPreset,
    start,
    pause,
    resume,
    reset,
    add30s,
  }
}
