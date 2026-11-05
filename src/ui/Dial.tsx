import type { TimerStatus } from '../timer/index.ts'

const R = 45
const C = 2 * Math.PI * R

const LABELS: Record<TimerStatus, string> = {
  idle: 'Ready',
  running: 'Running',
  paused: 'Paused',
  done: 'Done',
}

export function Dial(props: {
  display: string
  progress: number
  status: TimerStatus
  /** Flashing alarm; a tap anywhere on the dial calls `onDismiss`. */
  alarming?: boolean
  onDismiss?: () => void
}) {
  const { display, progress, status, alarming = false, onDismiss } = props
  const p = Math.min(1, Math.max(0, progress))
  const dismiss = alarming ? onDismiss : undefined
  return (
    <div
      class={`dial dial--${status}${alarming ? ' dial--alarm' : ''}`}
      data-status={status}
      role={alarming ? 'button' : undefined}
      tabIndex={alarming ? 0 : undefined}
      aria-label={alarming ? 'Dismiss alarm' : undefined}
      onClick={dismiss}
      onKeyDown={
        dismiss &&
        ((e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            dismiss()
          }
        })
      }
    >
      <svg class="dial__ring" viewBox="0 0 100 100" aria-hidden="true">
        <circle class="dial__track" cx="50" cy="50" r={R} />
        <circle
          class="dial__progress"
          cx="50"
          cy="50"
          r={R}
          stroke-dasharray={C}
          stroke-dashoffset={C * (1 - p)}
        />
      </svg>
      <div class="dial__center">
        <time class="dial__time" role="timer" aria-live="off">
          {display}
        </time>
        <span class="dial__label" aria-live="polite">
          {LABELS[status]}
        </span>
      </div>
    </div>
  )
}
