import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app.tsx'
import {
  memoryRepository,
  type Exercise,
  type Repository,
  type SetRecord,
} from '../data/index.ts'

// Noon local time, so "yesterday" and "today" never straddle a TZ edge.
const TODAY = new Date(2026, 10, 5, 12).getTime()
const YESTERDAY = TODAY - 24 * 3600_000

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(TODAY)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

const button = (name: string | RegExp) => screen.getByRole('button', { name })
const queryButton = (name: string | RegExp) =>
  screen.queryByRole('button', { name })
const count = () => document.querySelector('.badge__count')?.textContent

/** Let the repository's load promises settle without advancing timers. */
async function flush() {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve()
  })
}

async function renderApp(repo: Repository = memoryRepository()) {
  const view = render(<App repo={repo} />)
  await flush()
  return { ...view, repo }
}

async function addExercise(name: string) {
  fireEvent.click(button('+ New'))
  fireEvent.input(screen.getByLabelText('Exercise name'), {
    target: { value: name },
  })
  fireEvent.click(button('Add'))
  await flush()
}

const ex = (id: string, name: string, lastUsed: number): Exercise => ({
  id,
  name,
  lastUsed,
})
const set = (id: string, exerciseId: string, startedAt: number): SetRecord => ({
  id,
  exerciseId,
  startedAt,
  durationS: 60,
})

describe('exercise chips', () => {
  it('first run: only + New, no badge, and Start records nothing', async () => {
    const { repo } = await renderApp()
    expect(screen.getByRole('group', { name: 'Exercises' })).toBeTruthy()
    expect(button('+ New')).toBeTruthy()
    expect(document.querySelector('.badge')).toBeNull()
    fireEvent.click(button('Start'))
    await flush()
    expect(await repo.listSets()).toEqual([])
  })

  it('+ New creates and selects an exercise, which is stored', async () => {
    const { repo } = await renderApp()
    await addExercise('  Bench press ')
    expect(button('Bench press').getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByLabelText('Exercise name')).toBeNull()
    expect(count()).toBe('0')
    const stored = await repo.listExercises()
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({ name: 'Bench press', lastUsed: TODAY })
  })

  it('blank names are not added', async () => {
    const { repo } = await renderApp()
    fireEvent.click(button('+ New'))
    fireEvent.input(screen.getByLabelText('Exercise name'), {
      target: { value: '   ' },
    })
    expect((button('Add') as HTMLButtonElement).disabled).toBe(true)
    expect(await repo.listExercises()).toEqual([])
  })

  it('shows at most 6, most recent first; a tap selects and bumps lastUsed without reordering', async () => {
    const exercises = Array.from({ length: 8 }, (_, i) =>
      ex(`e${i}`, `Ex ${i}`, YESTERDAY + i),
    )
    const { repo } = await renderApp(memoryRepository({ exercises }))
    const names = [
      ...document.querySelectorAll<HTMLButtonElement>('.chip--exercise'),
    ].map((b) => b.textContent)
    expect(names).toEqual(['Ex 7', 'Ex 6', 'Ex 5', 'Ex 4', 'Ex 3', 'Ex 2'])
    expect(button('Ex 7').getAttribute('aria-pressed')).toBe('true')

    vi.setSystemTime(TODAY + 5_000)
    fireEvent.click(button('Ex 3'))
    await flush()
    expect(button('Ex 3').getAttribute('aria-pressed')).toBe('true')
    expect(button('Ex 7').getAttribute('aria-pressed')).toBe('false')
    // Order is fixed for the session, so chips do not shift under the finger.
    const chipNames = () =>
      [...document.querySelectorAll('.chip--exercise')].map(
        (b) => b.textContent,
      )
    expect(chipNames()).toEqual(names)
    const stored = await repo.listExercises()
    expect(stored.find((e) => e.id === 'e3')?.lastUsed).toBe(TODAY + 5_000)

    // The next load (or a create) uses the new lastUsed order.
    cleanup()
    await renderApp(repo)
    expect(chipNames()[0]).toBe('Ex 3')
    expect(button('Ex 3').getAttribute('aria-pressed')).toBe('true')
  })

  it('tapping the selected chip deselects; none stays selected after reload', async () => {
    const repo = memoryRepository({
      exercises: [ex('a', 'Bench', YESTERDAY), ex('b', 'Squat', YESTERDAY + 1)],
    })
    await renderApp(repo)
    expect(button('Squat').getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(button('Squat'))
    expect(button('Squat').getAttribute('aria-pressed')).toBe('false')
    expect(button('Bench').getAttribute('aria-pressed')).toBe('false')
    expect(document.querySelector('.badge')).toBeNull()
    fireEvent.click(button('Start'))
    await flush()
    expect(await repo.listSets()).toEqual([])
    expect(await repo.getSelectedExerciseId()).toBeNull()

    cleanup()
    await renderApp(repo)
    // Explicit null is restored, not replaced by the latest lastUsed.
    expect(
      document.querySelector('.chip--exercise[aria-pressed="true"]'),
    ).toBeNull()
    expect(document.querySelector('.badge')).toBeNull()

    fireEvent.click(button('Bench'))
    expect(count()).toBe('0')
    await flush()
    expect(await repo.getSelectedExerciseId()).toBe('a')
  })

  it('restores a stored selection over the latest lastUsed', async () => {
    await renderApp(
      memoryRepository({
        exercises: [
          ex('a', 'Bench', YESTERDAY),
          ex('b', 'Squat', YESTERDAY + 1),
        ],
        selectedExerciseId: 'a',
      }),
    )
    expect(button('Bench').getAttribute('aria-pressed')).toBe('true')
  })

  it('+ New with an existing name selects it instead of duplicating', async () => {
    const repo = memoryRepository({
      exercises: [ex('a', 'Bench press', YESTERDAY), ex('b', 'Squat', TODAY)],
    })
    await renderApp(repo)
    await addExercise('  bench PRESS ')
    expect(button('Bench press').getAttribute('aria-pressed')).toBe('true')
    expect(document.querySelectorAll('.chip--exercise')).toHaveLength(2)
    expect(await repo.listExercises()).toHaveLength(2)
    expect(await repo.getSelectedExerciseId()).toBe('a')
  })
})

describe('set recording', () => {
  it('records one set per Start or preset tap, none on pause/resume/+30s/reset', async () => {
    const { repo } = await renderApp()
    await addExercise('Squat')

    fireEvent.click(button('Start'))
    fireEvent.click(button('Pause'))
    fireEvent.click(button('Resume'))
    fireEvent.click(button('+30s'))
    expect(count()).toBe('1')
    fireEvent.click(button('Reset'))
    expect(count()).toBe('1')

    fireEvent.click(button('90s'))
    expect(count()).toBe('2')
    act(() => {
      vi.advanceTimersByTime(90_000)
    })
    expect(screen.getByText('Done')).toBeTruthy()
    // A preset tap from done resets and starts: a new set.
    fireEvent.click(button('30s'))
    expect(count()).toBe('3')
    await flush()

    const sets = await repo.listSets()
    expect(sets.map((s) => s.durationS).sort()).toEqual([30, 60, 90])
    expect(sets.every((s) => s.exerciseId === sets[0].exerciseId)).toBe(true)
    expect(sets.map((s) => s.startedAt).sort()).toEqual([
      TODAY,
      TODAY,
      TODAY + 90_000,
    ])
  })

  it('counts only today, so yesterday does not show', async () => {
    const repo = memoryRepository({
      exercises: [ex('a', 'Row', YESTERDAY)],
      sets: [set('y1', 'a', YESTERDAY), set('y2', 'a', YESTERDAY + 1)],
    })
    await renderApp(repo)
    expect(count()).toBe('0')
    expect((button('Remove a set') as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('set badge', () => {
  it('+1 adds a set with the selected duration; -1 removes the latest today', async () => {
    const repo = memoryRepository({
      exercises: [ex('a', 'Dips', YESTERDAY)],
      sets: [set('y1', 'a', YESTERDAY), set('t1', 'a', TODAY - 60_000)],
    })
    await renderApp(repo)
    expect(count()).toBe('1')
    fireEvent.click(button('90s'))
    fireEvent.click(button('Reset'))
    expect(count()).toBe('2')

    fireEvent.click(button('Add a set'))
    expect(count()).toBe('3')
    await flush()
    const added = (await repo.listSets()).filter((s) => s.id !== 'y1')
    expect(added.map((s) => s.durationS).sort()).toEqual([60, 90, 90])

    // Two quick taps in one tick each remove a different set.
    act(() => {
      fireEvent.click(button('Remove a set'))
      fireEvent.click(button('Remove a set'))
    })
    expect(count()).toBe('1')
    fireEvent.click(button('Remove a set'))
    expect(count()).toBe('0')
    fireEvent.click(button('Remove a set'))
    expect(count()).toBe('0')
    await flush()
    // Yesterday's set is untouched.
    expect((await repo.listSets()).map((s) => s.id)).toEqual(['y1'])
  })
})

describe('loading and persistence', () => {
  it('renders no count until stored data has loaded', async () => {
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    const inner = memoryRepository({
      exercises: [ex('a', 'Curl', YESTERDAY)],
      sets: [set('t1', 'a', TODAY - 1), set('t2', 'a', TODAY - 2)],
    })
    const repo: Repository = {
      ...inner,
      listSets: async () => {
        await gate
        return inner.listSets()
      },
    }
    render(<App repo={repo} />)
    await flush()
    expect(document.querySelector('.badge')).toBeNull()
    expect(document.querySelector('.chip--exercise')).toBeNull()
    expect(
      document.querySelector('.exercises')?.getAttribute('aria-busy'),
    ).toBe('true')
    release()
    await flush()
    expect(count()).toBe('2')
    expect(button('Curl').getAttribute('aria-pressed')).toBe('true')
  })

  it('the last-used exercise is selected again after a reload', async () => {
    const repo = memoryRepository()
    const first = await renderApp(repo)
    await addExercise('Bench')
    vi.setSystemTime(TODAY + 1_000)
    await addExercise('Squat')
    vi.setSystemTime(TODAY + 2_000)
    fireEvent.click(button('Bench'))
    fireEvent.click(button('Start'))
    await flush()
    first.unmount()

    await renderApp(repo)
    expect(button('Bench').getAttribute('aria-pressed')).toBe('true')
    expect(button('Squat').getAttribute('aria-pressed')).toBe('false')
    expect(count()).toBe('1')
  })

  it('storage errors are logged and never break the timer', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fail = () => Promise.reject(new Error('quota'))
    const repo: Repository = {
      listExercises: fail,
      putExercise: fail,
      listSets: fail,
      listSetsForDay: fail,
      addSet: fail,
      deleteSet: () => {
        throw new Error('sync throw')
      },
      getSelectedExerciseId: fail,
      setSelectedExerciseId: fail,
    }
    await renderApp(repo)
    expect(error).toHaveBeenCalledTimes(1)
    // Loaded (empty) after the failure, so the user can still add exercises.
    await addExercise('Press')
    expect(button('Press').getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(button('Start'))
    expect(count()).toBe('1')
    fireEvent.click(button('Remove a set'))
    expect(count()).toBe('0')
    await flush()
    expect(button('Pause')).toBeTruthy()
    expect(screen.getByRole('timer').textContent).toBe('01:00')
    // load, putExercise, setSelectedExerciseId, addSet, deleteSet
    expect(error).toHaveBeenCalledTimes(5)
    expect(queryButton('Start')).toBeNull()
  })
})
