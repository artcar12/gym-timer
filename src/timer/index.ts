/**
 * Public API of the pure timer core. See `timer.ts` for the state machine and
 * the invalid-transition policy.
 */
export {
  ADD_MS,
  IDLE,
  reduce,
  remainingMs,
  type DoneState,
  type IdleState,
  type PausedState,
  type RunningState,
  type TimerAction,
  type TimerState,
  type TimerStatus,
} from './timer.ts'
export { createTimer, type Clock, type Timer } from './createTimer.ts'
