import { useMemo } from 'preact/hooks'
import { exerciseCounts, setsForDay } from '../data/index.ts'
import { CountList } from './CountList.tsx'
import type { WorkoutView } from './useWorkout.ts'

/** Today's exercises with set counts, most sets first, and the day total. */
export function TodayScreen(props: { workout: WorkoutView }) {
  const { loaded, sets, exercises, today } = props.workout
  // The shell re-renders every frame while the timer runs; derive only on change.
  const counts = useMemo(
    () => exerciseCounts(setsForDay(sets, today), exercises),
    [sets, exercises, today],
  )
  const total = counts.reduce((n, c) => n + c.count, 0)
  return (
    <main class="screen screen--list">
      <h1 class="screen__title">Today</h1>
      {!loaded ? null : total === 0 ? (
        <p class="empty">
          No sets yet today. Pick an exercise on the Timer tab; each Start
          counts as a set.
        </p>
      ) : (
        <>
          <section class="card total" aria-label="Day total">
            <span class="total__count">{total}</span>
            <span class="total__label">
              {total === 1 ? 'set' : 'sets'} today
            </span>
          </section>
          <section class="card" aria-label="Exercises">
            <CountList counts={counts} />
          </section>
        </>
      )}
    </main>
  )
}
