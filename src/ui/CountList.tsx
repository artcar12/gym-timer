import type { ExerciseCount } from '../data/index.ts'

/** Exercise names with their set counts, in the given order. */
export function CountList(props: { counts: ExerciseCount[] }) {
  return (
    <ul class="counts">
      {props.counts.map((c) => (
        <li key={c.exerciseId} class="counts__row">
          <span class="counts__name" title={c.name}>
            {c.name}
          </span>
          <span class="counts__count">{c.count}</span>
        </li>
      ))}
    </ul>
  )
}
