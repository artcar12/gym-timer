import type { TimerView } from './useTimer.ts'

/** Only the controls valid for the current state are rendered. */
export function Controls(props: { timer: TimerView }) {
  const t = props.timer
  const s = t.status
  return (
    <div class="controls">
      {s !== 'idle' && (
        <button type="button" class="btn btn--tonal" onClick={t.reset}>
          Reset
        </button>
      )}
      {s === 'idle' && (
        <button type="button" class="btn btn--filled" onClick={t.start}>
          Start
        </button>
      )}
      {s === 'running' && (
        <button type="button" class="btn btn--filled" onClick={t.pause}>
          Pause
        </button>
      )}
      {s === 'paused' && (
        <button type="button" class="btn btn--filled" onClick={t.resume}>
          Resume
        </button>
      )}
      {(s === 'running' || s === 'paused') && (
        <button type="button" class="btn btn--tonal" onClick={t.add30s}>
          +30s
        </button>
      )}
    </div>
  )
}
