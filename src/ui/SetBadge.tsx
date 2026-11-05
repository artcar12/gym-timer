/** Today's set count for the selected exercise, with manual -1 / +1. */
export function SetBadge(props: {
  exerciseName: string
  count: number
  onIncrement: () => void
  onDecrement: () => void
}) {
  const { exerciseName, count, onIncrement, onDecrement } = props
  return (
    <div class="badge" role="group" aria-label={`Sets today: ${exerciseName}`}>
      <button
        type="button"
        class="badge__btn"
        aria-label="Remove a set"
        disabled={count === 0}
        onClick={onDecrement}
      >
        −1
      </button>
      <div class="badge__body">
        <output class="badge__count" aria-live="polite">
          {count}
        </output>
        <span class="badge__label">
          {count === 1 ? 'set' : 'sets'} today · {exerciseName}
        </span>
      </div>
      <button
        type="button"
        class="badge__btn"
        aria-label="Add a set"
        onClick={onIncrement}
      >
        +1
      </button>
    </div>
  )
}
