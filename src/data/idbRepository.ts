import { createStore, del, get, set, values, type UseStore } from 'idb-keyval'
import { setsForDay } from './derive.ts'
import type { Repository } from './repository.ts'
import type { Exercise, SetRecord } from './types.ts'

/**
 * IndexedDB repository via idb-keyval, keyed by record id. Stores are opened
 * lazily on first use, so importing or constructing this never touches
 * IndexedDB (and a missing IndexedDB becomes a rejected promise).
 *
 * Data is split across separate idb-keyval stores (exercises, sets, meta),
 * each in its own database, as idb-keyval's `createStore` expects. So there
 * are no indexes and no transactions spanning stores. Adding either (e.g. an
 * index on `startedAt`, or deleting an exercise with its sets atomically)
 * would need the raw `idb` library and a migration of the existing databases.
 */
const SELECTED_KEY = 'selectedExerciseId'

export function idbRepository(prefix = 'gym-timer'): Repository {
  let stores:
    { exercises: UseStore; sets: UseStore; meta: UseStore } | undefined
  const open = () =>
    (stores ??= {
      exercises: createStore(`${prefix}-exercises`, 'exercises'),
      sets: createStore(`${prefix}-sets`, 'sets'),
      meta: createStore(`${prefix}-meta`, 'meta'),
    })
  return {
    listExercises: async () => values<Exercise>(open().exercises),
    putExercise: async (e) => set(e.id, e, open().exercises),
    listSets: async () => values<SetRecord>(open().sets),
    // Few sets per day on one device: a scan is simpler than an index.
    listSetsForDay: async (day) =>
      setsForDay(await values<SetRecord>(open().sets), day),
    addSet: async (s) => set(s.id, s, open().sets),
    deleteSet: async (id) => del(id, open().sets),
    getSelectedExerciseId: async () =>
      get<string | null>(SELECTED_KEY, open().meta),
    setSelectedExerciseId: async (id) => set(SELECTED_KEY, id, open().meta),
  }
}
