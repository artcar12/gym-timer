/**
 * Pure timer core. No DOM, no globals, no clock reads: every function that
 * needs the current time takes it as a `nowMs` argument (milliseconds,
 * supplied by the caller). Use `Date.now()` whenever state will be saved and
 * restored: `performance.now()` restarts on every page load, so a persisted
 * `RunningState.startedAt` would be wrong after a reload.
 *
 * Remaining time is always derived from a stored start timestamp and the
 * duration left at that moment, never from counting ticks, so it stays correct
 * after arbitrary time jumps (a backgrounded tab, a sleeping phone).
 *
 * Invalid-transition policy:
 * - A transition that is not allowed from the current state (e.g. `pause`
 *   while idle, `start` while running) is a no-op: `reduce` returns the very
 *   same state object, so callers can detect it with `===`.
 * - Invalid arguments are programming errors and throw `RangeError`: a start
 *   duration that is not a finite number > 0, or a `nowMs` that is not finite.
 * - Before any action is applied, a running timer whose remaining time has
 *   reached 0 is settled to `done`. So `pause` or `add30s` after expiry yield
 *   `done` (and then act on `done`, where they are no-ops).
 * - `start` is only valid from idle, so after a finished timer the UI must
 *   send `reset` and then `start` when a preset is tapped.
 */

/** Milliseconds added by the `add30s` action. */
export const ADD_MS = 30_000

/** Timer is not counting and holds no duration. */
export interface IdleState {
  readonly status: 'idle'
}

/** Timer is counting down. */
export interface RunningState {
  readonly status: 'running'
  /** Clock value (ms) when this run segment began (start or last resume). */
  readonly startedAt: number
  /** Time left (ms) at `startedAt`; remaining = startedAt + durationMs - now. */
  readonly durationMs: number
  /** Full length of this timer (ms), including any +30s; for progress display. */
  readonly totalMs: number
}

/** Timer is frozen with time left on it. */
export interface PausedState {
  readonly status: 'paused'
  /** Time left (ms) at the moment of pausing; does not change while paused. */
  readonly remainingMs: number
  /** Full length of this timer (ms), including any +30s; for progress display. */
  readonly totalMs: number
}

/** Timer reached zero. Stays here until reset. */
export interface DoneState {
  readonly status: 'done'
  /** Clock value (ms) at which the countdown actually hit zero. */
  readonly finishedAt: number
  /** Full length of the finished timer (ms), including any +30s. */
  readonly totalMs: number
}

/** Immutable timer state, discriminated on `status`. */
export type TimerState = IdleState | RunningState | PausedState | DoneState

/** The four possible values of `TimerState['status']`. */
export type TimerStatus = TimerState['status']

/** Actions accepted by {@link reduce}. */
export type TimerAction =
  /** idle -> running with the given duration (ms, finite, > 0). */
  | { readonly type: 'start'; readonly durationMs: number }
  /** running -> paused. */
  | { readonly type: 'pause' }
  /** paused -> running, continuing from the paused remaining time. */
  | { readonly type: 'resume' }
  /** any -> idle. */
  | { readonly type: 'reset' }
  /** running or paused: add {@link ADD_MS} to the remaining time. */
  | { readonly type: 'add30s' }
  /** Recompute: running -> done once remaining reaches 0; otherwise no-op. */
  | { readonly type: 'tick' }

/** The initial idle state. */
export const IDLE: IdleState = Object.freeze({ status: 'idle' })

function assertFiniteNow(nowMs: number): void {
  if (!Number.isFinite(nowMs)) {
    throw new RangeError(`nowMs must be a finite number, got ${nowMs}`)
  }
}

/**
 * Remaining time in ms for `state` at clock value `nowMs`.
 * Idle and done return 0. Running is clamped to [0, durationMs], so a clock
 * that steps backwards never shows more time than the segment started with.
 */
export function remainingMs(state: TimerState, nowMs: number): number {
  assertFiniteNow(nowMs)
  switch (state.status) {
    case 'idle':
    case 'done':
      return 0
    case 'paused':
      return state.remainingMs
    case 'running': {
      const left = state.startedAt + state.durationMs - nowMs
      return Math.min(state.durationMs, Math.max(0, left))
    }
  }
}

/** Settle a running timer that has run out into `done`; otherwise return as is. */
function settle(state: TimerState, nowMs: number): TimerState {
  if (state.status === 'running' && remainingMs(state, nowMs) <= 0) {
    return {
      status: 'done',
      finishedAt: state.startedAt + state.durationMs,
      totalMs: state.totalMs,
    }
  }
  return state
}

/**
 * Pure transition function. Returns the next state for `action` applied at
 * clock value `nowMs`. Disallowed transitions return `state` unchanged (same
 * object). Throws `RangeError` for invalid arguments; see module docs.
 */
export function reduce(
  state: TimerState,
  action: TimerAction,
  nowMs: number,
): TimerState {
  assertFiniteNow(nowMs)
  if (action.type === 'start') {
    const d = action.durationMs
    if (!Number.isFinite(d) || d <= 0) {
      throw new RangeError(`durationMs must be a finite number > 0, got ${d}`)
    }
  }

  const s = settle(state, nowMs)

  switch (action.type) {
    case 'start':
      if (s.status !== 'idle') return s
      return {
        status: 'running',
        startedAt: nowMs,
        durationMs: action.durationMs,
        totalMs: action.durationMs,
      }

    case 'pause':
      if (s.status !== 'running') return s
      return {
        status: 'paused',
        remainingMs: remainingMs(s, nowMs),
        totalMs: s.totalMs,
      }

    case 'resume':
      if (s.status !== 'paused') return s
      return {
        status: 'running',
        startedAt: nowMs,
        durationMs: s.remainingMs,
        totalMs: s.totalMs,
      }

    case 'reset':
      return s.status === 'idle' ? s : IDLE

    case 'add30s':
      if (s.status === 'running') {
        return {
          ...s,
          durationMs: s.durationMs + ADD_MS,
          totalMs: s.totalMs + ADD_MS,
        }
      }
      if (s.status === 'paused') {
        return {
          ...s,
          remainingMs: s.remainingMs + ADD_MS,
          totalMs: s.totalMs + ADD_MS,
        }
      }
      return s

    case 'tick':
      return s
  }
}
