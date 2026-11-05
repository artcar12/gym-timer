import { setsForDay } from './derive.ts'
import type { Repository } from './repository.ts'
import type { Exercise, SetRecord } from './types.ts'

/** In-memory repository for tests and as a reference implementation. */
export function memoryRepository(
  seed: { exercises?: Exercise[]; sets?: SetRecord[] } = {},
): Repository {
  const exercises = new Map(seed.exercises?.map((e) => [e.id, e]))
  const sets = new Map(seed.sets?.map((s) => [s.id, s]))
  return {
    listExercises: async () => [...exercises.values()],
    putExercise: async (e) => {
      exercises.set(e.id, e)
    },
    listSets: async () => [...sets.values()],
    listSetsForDay: async (day) => setsForDay([...sets.values()], day),
    addSet: async (s) => {
      sets.set(s.id, s)
    },
    deleteSet: async (id) => {
      sets.delete(id)
    },
  }
}
