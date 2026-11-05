import { act, cleanup, renderHook } from '@testing-library/preact'
import { afterEach, expect, it, vi } from 'vitest'
import type { Repository } from '../data/index.ts'
import { useWorkout } from './useWorkout.ts'

afterEach(cleanup)

async function flush() {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve()
  })
}

it('after a failed initial load it is loaded and empty, and create and recording still work', async () => {
  const onError = vi.fn()
  const fail = () => Promise.reject(new Error('blocked'))
  const writes: string[] = []
  const repo: Repository = {
    listExercises: fail,
    listSets: fail,
    listSetsForDay: fail,
    getSelectedExerciseId: fail,
    putExercise: async (e) => void writes.push(`exercise:${e.name}`),
    addSet: async (s) => void writes.push(`set:${s.durationS}`),
    deleteSet: async () => {},
    setSelectedExerciseId: async (id) => void writes.push(`selected:${id}`),
  }
  let n = 0
  const { result } = renderHook(() =>
    useWorkout({ repo, now: () => 1_000, newId: () => `id${++n}`, onError }),
  )
  expect(result.current.loaded).toBe(false)
  await flush()
  expect(onError).toHaveBeenCalledTimes(1)
  expect(result.current.loaded).toBe(true)
  expect(result.current.recent).toEqual([])
  expect(result.current.selected).toBeNull()

  act(() => result.current.create('Lunge'))
  expect(result.current.selected?.name).toBe('Lunge')
  act(() => result.current.recordSet(45_000, 2_000))
  expect(result.current.todayCount).toBe(1)
  await flush()
  expect(writes).toEqual(['exercise:Lunge', 'selected:id1', 'set:45'])
  expect(onError).toHaveBeenCalledTimes(1)
})
