import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import {
  IDLE,
  reduce,
  remainingMs,
  type Clock,
  type TimerAction,
  type TimerState,
} from '../timer/index.ts'
import {
  browserTimeouts,
  createVibrator,
  createWakeLock,
  createWebAudio,
  type AlarmAudio,
  type Timeouts,
  type Vibrator,
  type WakeLock,
} from '../platform/index.ts'
import { formatMs } from './format.ts'

/**
 * Schedules a callback for the next frame. Only used to trigger re-renders;
 * elapsed time always comes from the clock, never from counting calls.
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

/** The alarm rings once per period until dismissed. */
export const ALARM_PERIOD_MS = 1_000
/** Vibration per alarm period (ms on, off, on); fits inside the period. */
export const VIBRATE_PATTERN = [400, 200, 300]

// Created lazily by the adapters themselves: nothing touches browser APIs at import.
const defaultWakeLock = createWakeLock()
const defaultAudio = createWebAudio()
const defaultVibrator = createVibrator()

export interface UseTimerOptions {
  /** Clock in ms. Defaults to `Date.now` (safe to persist, unlike performance.now). */
  now?: Clock
  /** Frame scheduler. Must be a stable reference. Defaults to rAF. */
  scheduler?: Scheduler
  /** Preset selected before the user picks one. */
  initialPresetMs?: number
  /** Screen wake lock, held while running. Must be a stable reference. */
  wakeLock?: WakeLock
  /** Alarm sound. Must be a stable reference. */
  audio?: AlarmAudio
  /** Alarm vibration. Must be a stable reference. */
  vibrator?: Vibrator
  /** Done detection and alarm repeat. Must be a stable reference. */
  timeouts?: Timeouts
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
  /** Done and not yet dismissed: beeping, vibrating and flashing. */
  alarming: boolean
  /** Silence the alarm and stop the flash; the timer stays done. */
  dismiss(): void
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
    wakeLock = defaultWakeLock,
    audio = defaultAudio,
    vibrator = defaultVibrator,
    timeouts = browserTimeouts,
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

  // Frame loop, only while running, for display only: it re-renders so the
  // countdown moves. Done detection is the timeout below, since frames stop
  // in hidden tabs.
  const running = state.status === 'running'
  useEffect(() => {
    if (!running) return
    let handle = 0
    const loop = () => {
      setFrame((f) => f + 1)
      handle = scheduler.request(loop)
    }
    handle = scheduler.request(loop)
    return () => scheduler.cancel(handle)
  }, [running, scheduler])

  const stateRef = useRef(state)
  stateRef.current = state

  // Done detection. The frame loop above stops in hidden tabs, so a timeout
  // armed for the remaining time drives running -> done. It is re-armed for
  // every new running state object (start, resume, +30s) and cleared when the
  // state leaves running (pause, reset, done) or on unmount.
  useEffect(() => {
    if (state.status !== 'running') return
    let handle = 0
    const left = () => remainingMs(state, nowRef.current())
    const arm = () => {
      handle = timeouts.set(fire, left())
    }
    // Timers may fire a little early against the wall clock: re-arm if so.
    const fire = () => (left() > 0 ? arm() : recompute())
    arm()
    return () => timeouts.clear(handle)
  }, [state, timeouts, recompute])

  // Screen stays on while running; released on pause, done, reset, unmount.
  useEffect(() => {
    if (!running) return
    wakeLock.acquire()
    return () => wakeLock.release()
  }, [running, wakeLock])

  // Background tabs throttle frames and timeouts and the browser drops the
  // wake lock when hidden: recompute and re-acquire once visible again.
  useEffect(() => {
    const onVisibility = () => {
      recompute()
      if (document.visibilityState !== 'visible') return
      const s = reduce(stateRef.current, TICK, nowRef.current())
      if (s.status === 'running') wakeLock.acquire()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [recompute, wakeLock])

  // The done state object the user dismissed; a later done is a new object.
  const [dismissed, setDismissed] = useState<TimerState | null>(null)
  const alarming = state.status === 'done' && dismissed !== state

  // Alarm: beep and vibrate every period until dismissed or the state leaves done.
  useEffect(() => {
    if (!alarming) return
    let handle = 0
    const ring = () => {
      audio.beep()
      vibrator.vibrate(VIBRATE_PATTERN)
      handle = timeouts.set(ring, ALARM_PERIOD_MS)
    }
    ring()
    return () => {
      timeouts.clear(handle)
      audio.stop()
      vibrator.cancel()
    }
  }, [alarming, audio, vibrator, timeouts])

  const dismiss = useCallback(() => {
    const s = stateRef.current
    if (s.status === 'done') setDismissed(s)
  }, [])

  // Audio must be unlocked synchronously inside the tap handler (not in a
  // state updater or effect) or mobile browsers keep the alarm muted. It is
  // cheap and idempotent, so every Start / Resume / preset tap does it.
  const selectPreset = useCallback(
    (ms: number) => {
      audio.unlock()
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
    },
    [audio],
  )

  const start = useCallback(() => {
    audio.unlock()
    dispatch({ type: 'start', durationMs: selectedMs })
  }, [audio, dispatch, selectedMs])
  const pause = useCallback(() => dispatch({ type: 'pause' }), [dispatch])
  const resume = useCallback(() => {
    audio.unlock()
    dispatch({ type: 'resume' })
  }, [audio, dispatch])
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
    alarming,
    dismiss,
    selectPreset,
    start,
    pause,
    resume,
    reset,
    add30s,
  }
}
