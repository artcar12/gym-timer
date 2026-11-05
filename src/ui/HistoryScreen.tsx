import { useMemo, useState } from 'preact/hooks'
import { daySummaries, exportFileName, serializeExport } from '../data/index.ts'
import { CountList } from './CountList.tsx'
import { downloadText } from './download.ts'
import { dayLabel, setsLabel } from './format.ts'
import { Icon } from './icons.tsx'
import type { WorkoutView } from './useWorkout.ts'

/**
 * Previous days, newest first, each expandable to per-exercise counts, and
 * a JSON export of everything stored.
 */
export function HistoryScreen(props: {
  workout: WorkoutView
  now: () => number
}) {
  const { loaded, sets, exercises, today } = props.workout
  const days = useMemo(
    () => daySummaries(sets, exercises).filter((d) => d.day < today),
    [sets, exercises, today],
  )
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())
  const toggle = (day: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (!next.delete(day)) next.add(day)
      return next
    })

  const exportAll = () => {
    const t = props.now()
    downloadText(exportFileName(t), serializeExport(exercises, sets, t))
  }

  return (
    <main class="screen screen--list">
      <div class="screen__bar">
        <h1 class="screen__title">History</h1>
        <button
          type="button"
          class="btn btn--tonal btn--icon"
          disabled={!loaded || (sets.length === 0 && exercises.length === 0)}
          onClick={exportAll}
        >
          <Icon name="download" size={18} />
          Export
        </button>
      </div>
      {!loaded ? null : days.length === 0 ? (
        <p class="empty">
          No previous workouts yet. Days you train show up here from tomorrow.
        </p>
      ) : (
        <ul class="days">
          {days.map((d) => {
            const expanded = open.has(d.day)
            const panel = `day-${d.day}`
            return (
              <li key={d.day} class="card day">
                <button
                  type="button"
                  class="day__head"
                  aria-expanded={expanded}
                  aria-controls={panel}
                  onClick={() => toggle(d.day)}
                >
                  <span class="day__label">{dayLabel(d.day, today)}</span>
                  <span class="day__total">{setsLabel(d.total)}</span>
                  <span class="day__chevron">
                    <Icon name="expand" />
                  </span>
                </button>
                {expanded && (
                  <div id={panel} class="day__body">
                    <CountList counts={d.exercises} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
