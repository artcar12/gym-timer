import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import {
  countsByExercise,
  dayKey,
  latestSet,
  recentExercises,
  setsForDay,
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
  /** Most recently used first, at most {@link RECENT_LIMIT}. */
  recent: Exercise[]
  selected: Exercise | null
  /** Sets today for the selected exercise; 0 when none is selected. */
  todayCount: number
  /** Select an exercise and bump its lastUsed. */
  select(id: string): void
  /** Create an exercise (trimmed name; blank is ignored) and select it. */
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
}

const EMPTY: Data = { exercises: [], sets: [], selectedId: null }

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
 * The selected exercise is the one with the latest lastUsed, so selection
 * survives a reload without storing it separately.
 */
export function useWorkout(options: UseWorkoutOptions): WorkoutView {
  const { repo, now = Date.now, newId = defaultId } = options
  const onErrorRef = useRef(options.onError ?? defaultOnError)
  onErrorRef.current = options.onError ?? defaultOnError

  const [data, setData] = useState<Data>(EMPTY)
  const [loaded, setLoaded] = useState(false)
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
    Promise.all([repo.listExercises(), repo.listSets()])
      .then(([exercises, sets]) => {
        if (!live) return
        const [last] = recentExercises(exercises, 1)
        commit({ exercises, sets, selectedId: last?.id ?? null })
      })
      .catch((err) => live && onErrorRef.current(err))
      .finally(() => live && setLoaded(true))
    return () => {
      live = false
    }
  }, [repo])

  const touch = (exercise: Exercise, d: Data): Data => {
    const others = d.exercises.filter((e) => e.id !== exercise.id)
    write(() => repo.putExercise(exercise))
    return { ...d, exercises: [...others, exercise], selectedId: exercise.id }
  }

  const select = useCallback(
    (id: string) => {
      const d = dataRef.current
      const ex = d.exercises.find((e) => e.id === id)
      if (!ex) return
      commit(touch({ ...ex, lastUsed: now() }, d))
    },
    [repo, now],
  )

  const create = useCallback(
    (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      commit(
        touch({ id: newId(), name: trimmed, lastUsed: now() }, dataRef.current),
      )
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
      write(() => repo.addSet(set))
    },
    [repo, now, newId],
  )

  const removeLatestToday = useCallback(() => {
    const d = dataRef.current
    if (!d.selectedId) return
    const last = latestSet(setsForDay(d.sets, dayKey(now())), d.selectedId)
    if (!last) return
    commit({ ...d, sets: d.sets.filter((s) => s.id !== last.id) })
    write(() => repo.deleteSet(last.id))
  }, [repo, now])

  const selected = data.exercises.find((e) => e.id === data.selectedId) ?? null
  const todayCount = selected
    ? (countsByExercise(setsForDay(data.sets, dayKey(now()))).get(
        selected.id,
      ) ?? 0)
    : 0

  return {
    loaded,
    recent: recentExercises(data.exercises, RECENT_LIMIT),
    selected,
    todayCount,
    select,
    create,
    recordSet,
    removeLatestToday,
  }
}
