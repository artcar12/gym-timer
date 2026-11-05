import type { DayKey, Exercise, SetRecord } from './types.ts'

/**
 * Persistence for exercises and sets. All methods are async and may reject
 * (quota, private mode, no IndexedDB); callers catch and log.
 */
export interface Repository {
  listExercises(): Promise<Exercise[]>
  /** Insert or replace by id (used for create and for lastUsed updates). */
  putExercise(exercise: Exercise): Promise<void>
  /** All sets, in no particular order. */
  listSets(): Promise<SetRecord[]>
  /** Sets whose `startedAt` falls on the given local day. */
  listSetsForDay(day: DayKey): Promise<SetRecord[]>
  addSet(set: SetRecord): Promise<void>
  /** Deleting an unknown id is a no-op. */
  deleteSet(id: string): Promise<void>
}
