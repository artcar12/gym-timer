import {
  IDLE,
  reduce,
  remainingMs,
  type TimerAction,
  type TimerState,
} from './timer.ts'

/** Injected clock: returns the current time in milliseconds. */
export type Clock = () => number

/**
 * Small stateful convenience wrapper over {@link reduce} and
 * {@link remainingMs}. Holds the current immutable state and reads time only
 * from the injected clock. Every method returns the new state.
 */
export interface Timer {
  /** Current state; replaced (never mutated) by each action. */
  readonly state: TimerState
  /** Remaining ms at the clock's current time. */
  remaining(): number
  /** Apply an arbitrary action at the clock's current time. */
  dispatch(action: TimerAction): TimerState
  start(durationMs: number): TimerState
  pause(): TimerState
  resume(): TimerState
  reset(): TimerState
  add30s(): TimerState
  tick(): TimerState
}

/** Create a {@link Timer} driven by `now`, optionally from an existing state. */
export function createTimer(now: Clock, initial: TimerState = IDLE): Timer {
  let state = initial
  const dispatch = (action: TimerAction): TimerState =>
    (state = reduce(state, action, now()))
  return {
    get state() {
      return state
    },
    remaining: () => remainingMs(state, now()),
    dispatch,
    start: (durationMs) => dispatch({ type: 'start', durationMs }),
    pause: () => dispatch({ type: 'pause' }),
    resume: () => dispatch({ type: 'resume' }),
    reset: () => dispatch({ type: 'reset' }),
    add30s: () => dispatch({ type: 'add30s' }),
    tick: () => dispatch({ type: 'tick' }),
  }
}
