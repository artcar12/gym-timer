import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import {
  countsByExercise,
  dayKey,
  latestSet,
  recentExercises,
  setsForDay,
  type DayKey,
  type Exercise,
  type Repository,
  type SetRecord,
} from '../data/index.ts'

/** Recent-exercise chips shown on the main screen. */
export const RECENT_LIMIT = 6

export interface UseWorkoutOptions {
  /** Storage. Must be a stable reference. */
  repo: Repository
  /** Clock in ms. Defaults to `Date.now`. */
  now?: () => number
  /** Id generator for new exercises and sets. */
  newId?: () => string
  /** Where storage errors go. Defaults to console.error. */
  onError?: (err: unknown) => void
}

export interface WorkoutView {
  /** False until stored data has loaded (or failed to); counts are hidden until then. */
  loaded: boolean
  /**
   * At most {@link RECENT_LIMIT}, most recently used first as of load (or
   * the last create). Selecting does not reorder, so chips stay put.
   */
  recent: Exercise[]
  /** All exercises, in no particular order. */
  exercises: Exercise[]
  /** All sets, in no particular order; screens derive their counts from these. */
  sets: SetRecord[]
  /**
   * The current local day. Recomputed on load, when the page becomes
   * visible, on {@link refreshDay} and when a set is recorded or removed,
   * so counts roll over at midnight without polling.
   */
  today: DayKey
  /** Recompute {@link today} from the clock (e.g. on a tab switch). */
  refreshDay(): void
  selected: Exercise | null
  /** Sets today for the selected exercise; 0 when none is selected. */
  todayCount: number
  /**
   * Select an exercise and bump its lastUsed; on the selected one, deselect
   * (then starts record nothing).
   */
  select(id: string): void
  /**
   * Create an exercise (trimmed name; blank is ignored) and select it. A
   * name matching an existing one (case-insensitive) selects that instead,
   * moving it to the front of the chips if it was not among them.
   */
  create(name: string): void
  /** Record a set for the selected exercise; no-op with none selected. */
  recordSet(durationMs: number, nowMs?: number): void
  /** Remove the latest set today for the selected exercise; no-op at 0. */
  removeLatestToday(): void
}

interface Data {
  exercises: Exercise[]
  sets: SetRecord[]
  selectedId: string | null
  /** Chip order (exercise ids), fixed between load and the next create. */
  order: string[]
}

const EMPTY: Data = { exercises: [], sets: [], selectedId: null, order: [] }

const orderOf = (exercises: Exercise[]) =>
  recentExercises(exercises, exercises.length).map((e) => e.id)

const sameName = (a: string, b: string) =>
  a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0

const defaultId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

const defaultOnError = (err: unknown) =>
  console.error('gym-timer: storage error', err)

/**
 * Exercises and sets: loaded once from the repository, then updated
 * optimistically in memory with the write sent to storage in the
 * background. A failed write is logged and never reaches the timer.
 * The selection is stored explicitly (null = none chosen); with nothing
 * stored yet it falls back to the exercise with the latest lastUsed.
 */
export function useWorkout(options: UseWorkoutOptions): WorkoutView {
  const { repo, now = Date.now, newId = defaultId } = options
  const onErrorRef = useRef(options.onError ?? defaultOnError)
  onErrorRef.current = options.onError ?? defaultOnError

  const [data, setData] = useState<Data>(EMPTY)
  const [loaded, setLoaded] = useState(false)
  const nowRef = useRef(now)
  nowRef.current = now
  // Same-value sets are skipped by Preact, so this is cheap to call often.
  const [today, setToday] = useState(() => dayKey(now()))
  const refreshDay = useCallback(() => setToday(dayKey(nowRef.current())), [])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshDay()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [refreshDay])
  // Mutations read and write this synchronously, so two taps before a
  // render (e.g. a double -1) see each other's result.
  const dataRef = useRef(data)
  const commit = (next: Data) => {
    dataRef.current = next
    setData(next)
  }

  const write = (op: () => Promise<void>) => {
    try {
      op().catch((err) => onErrorRef.current(err))
    } catch (err) {
      onErrorRef.current(err)
    }
  }

  useEffect(() => {
    let live = true
    Promise.all([
      repo.listExercises(),
      repo.listSets(),
      repo.getSelectedExerciseId(),
    ])
      .then(([exercises, sets, stored]) => {
        if (!live) return
        const order = orderOf(exercises)
        const known = (id: string | null | undefined) =>
          id != null && exercises.some((e) => e.id === id)
        // An explicit null is kept; a stale id or nothing stored falls back.
        const selectedId =
          stored === null ? null : known(stored) ? stored! : (order[0] ?? null)
        commit({ exercises, sets, selectedId, order })
      })
      .catch((err) => live && onErrorRef.current(err))
      .finally(() => {
        if (!live) return
        refreshDay()
        setLoaded(true)
      })
    return () => {
      live = false
    }
  }, [repo, refreshDay])

  const setSelected = (id: string | null) =>
    write(() => repo.setSelectedExerciseId(id))

  /** Select `ex` and store it with a fresh lastUsed; order is unchanged. */
  const pick = (ex: Exercise, d: Data): Data => {
    const touched = { ...ex, lastUsed: now() }
    write(() => repo.putExercise(touched))
    setSelected(touched.id)
    return {
      ...d,
      exercises: d.exercises.map((e) => (e.id === ex.id ? touched : e)),
      selectedId: touched.id,
    }
  }

  const select = useCallback(
    (id: string) => {
      const d = dataRef.current
      if (d.selectedId === id) {
        commit({ ...d, selectedId: null })
        setSelected(null)
        return
      }
      const ex = d.exercises.find((e) => e.id === id)
      if (ex) commit(pick(ex, d))
    },
    [repo, now],
  )

  const create = useCallback(
    (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      const d = dataRef.current
      const existing = d.exercises.find((e) => sameName(e.name, trimmed))
      if (existing) {
        const next = d.selectedId === existing.id ? d : pick(existing, d)
        const visible = d.order.slice(0, RECENT_LIMIT).includes(existing.id)
        if (next === d && visible) return
        commit(
          visible
            ? next
            : {
                ...next,
                order: [
                  existing.id,
                  ...d.order.filter((id) => id !== existing.id),
                ],
              },
        )
        return
      }
      const ex: Exercise = { id: newId(), name: trimmed, lastUsed: now() }
      write(() => repo.putExercise(ex))
      setSelected(ex.id)
      const exercises = [...d.exercises, ex]
      commit({ ...d, exercises, selectedId: ex.id, order: orderOf(exercises) })
    },
    [repo, now, newId],
  )

  const recordSet = useCallback(
    (durationMs: number, nowMs?: number) => {
      const d = dataRef.current
      if (!d.selectedId) return
      const set: SetRecord = {
        id: newId(),
        exerciseId: d.selectedId,
        startedAt: nowMs ?? now(),
        durationS: Math.round(durationMs / 1000),
      }
      commit({ ...d, sets: [...d.sets, set] })
      setToday(dayKey(set.startedAt))
      write(() => repo.addSet(set))
    },
    [repo, now, newId],
  )

  const removeLatestToday = useCallback(() => {
    const d = dataRef.current
    if (!d.selectedId) return
    const day = dayKey(now())
    setToday(day)
    const last = latestSet(setsForDay(d.sets, day), d.selectedId)
    if (!last) return
    commit({ ...d, sets: d.sets.filter((s) => s.id !== last.id) })
    write(() => repo.deleteSet(last.id))
  }, [repo, now])

  const selected = data.exercises.find((e) => e.id === data.selectedId) ?? null
  const todayCount = selected
    ? (countsByExercise(setsForDay(data.sets, today)).get(selected.id) ?? 0)
    : 0

  return {
    loaded,
    recent: data.order
      .slice(0, RECENT_LIMIT)
      .map((id) => data.exercises.find((e) => e.id === id)!),
    exercises: data.exercises,
    sets: data.sets,
    today,
    refreshDay,
    selected,
    todayCount,
    select,
    create,
    recordSet,
    removeLatestToday,
  }
}
