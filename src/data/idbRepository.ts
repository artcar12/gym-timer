import { createStore, del, set, values, type UseStore } from 'idb-keyval'
import { setsForDay } from './derive.ts'
import type { Repository } from './repository.ts'
import type { Exercise, SetRecord } from './types.ts'

/**
 * IndexedDB repository via idb-keyval, keyed by record id. Each object store
 * lives in its own database, as idb-keyval's `createStore` expects. Stores
 * are opened lazily on first use, so importing or constructing this never
 * touches IndexedDB (and a missing IndexedDB becomes a rejected promise).
 */
export function idbRepository(prefix = 'gym-timer'): Repository {
  let stores: { exercises: UseStore; sets: UseStore } | undefined
  const open = () =>
    (stores ??= {
      exercises: createStore(`${prefix}-exercises`, 'exercises'),
      sets: createStore(`${prefix}-sets`, 'sets'),
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
  }
}
