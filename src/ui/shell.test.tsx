import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/preact'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from 'vitest'
import { App } from '../app.tsx'
import {
  memoryRepository,
  type Exercise,
  type Repository,
  type SetRecord,
} from '../data/index.ts'
import type { AlarmAudio, Vibrator } from '../platform/index.ts'

// Noon local time, so day arithmetic never straddles a TZ edge.
const TODAY = new Date(2026, 10, 5, 12).getTime()
const DAY = 24 * 3600_000

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(TODAY)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const button = (name: string | RegExp) => screen.getByRole('button', { name })
const queryButton = (name: string | RegExp) =>
  screen.queryByRole('button', { name })
const nav = () => screen.getByRole('navigation', { name: 'Main' })
const tab = (name: RegExp) => within(nav()).getByRole('button', { name })
const timerTab = () => tab(/Timer$/)
const go = (name: 'Timer' | 'Today' | 'History') =>
  fireEvent.click(tab(new RegExp(`${name}$`)))
const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms)
  })

async function flush() {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve()
  })
}

const ex = (id: string, name: string, lastUsed = 0): Exercise => ({
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

function fakes() {
  const audio: AlarmAudio = {
    unlock: vi.fn(),
    beep: vi.fn(),
    stop: vi.fn(),
  } as unknown as AlarmAudio
  const vibrator: Vibrator = { vibrate: vi.fn(), cancel: vi.fn() }
  return { audio, vibrator }
}

async function renderApp(repo: Repository = memoryRepository()) {
  const f = fakes()
  const view = render(<App repo={repo} {...f} />)
  await flush()
  return { ...view, ...f, repo }
}

describe('tab bar', () => {
  it('has Timer, Today and History; the active one is marked', async () => {
    await renderApp()
    const names = within(nav())
      .getAllByRole('button')
      .map((b) => b.textContent)
    expect(names).toEqual(['Timer', 'Today', 'History'])
    expect(timerTab().getAttribute('aria-current')).toBe('page')
    go('Today')
    expect(tab(/Today$/).getAttribute('aria-current')).toBe('page')
    expect(timerTab().getAttribute('aria-current')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Today' })).toBeTruthy()
    // The Timer screen is hidden, not shown alongside.
    expect(queryButton('Start')).toBeNull()
    go('History')
    expect(screen.getByRole('heading', { name: 'History' })).toBeTruthy()
    go('Timer')
    expect(button('Start')).toBeTruthy()
  })
})

describe('switching tabs never touches the timer', () => {
  it('keeps counting on other tabs and reaches done with the alarm', async () => {
    const { audio, vibrator } = await renderApp()
    fireEvent.click(button('90s'))
    expect(screen.getByRole('timer').textContent).toBe('01:30')

    go('Today')
    advance(20_000)
    // The Timer tab shows the live countdown while elsewhere.
    expect(timerTab().textContent).toContain('01:10')

    go('Timer')
    expect(screen.getByRole('timer').textContent).toBe('01:10')
    expect(button('Pause')).toBeTruthy()
    expect(timerTab().textContent).toBe('Timer')

    go('History')
    advance(30_000)
    expect(timerTab().textContent).toContain('00:40')
    go('Today')
    expect(audio.beep).not.toHaveBeenCalled()
    advance(40_000)
    // Done while on Today: alarm rings and the tab says so.
    expect(audio.beep).toHaveBeenCalled()
    expect(vibrator.vibrate).toHaveBeenCalled()
    expect(timerTab().textContent).toContain('Done')
    expect(document.querySelector('.nav__badge--alarm')).not.toBeNull()

    go('Timer')
    expect(screen.getByRole('timer').textContent).toBe('00:00')
    expect(screen.getByText('Done')).toBeTruthy()
    expect(document.querySelector('.dial--alarm')).not.toBeNull()
    fireEvent.click(button('Dismiss alarm'))
    go('Today')
    expect(timerTab().textContent).toContain('Done')
    expect(document.querySelector('.nav__badge--alarm')).toBeNull()
  })

  it('a paused timer stays paused, and a custom time chip survives', async () => {
    await renderApp()
    fireEvent.click(button('Custom'))
    fireEvent.input(screen.getByLabelText('Time (m:ss)'), {
      target: { value: '1:45' },
    })
    fireEvent.click(button('Set'))
    advance(5_000)
    fireEvent.click(button('Pause'))
    go('History')
    advance(60_000)
    expect(timerTab().textContent).toContain('01:40')
    go('Timer')
    expect(screen.getByRole('timer').textContent).toBe('01:40')
    expect(button('Resume')).toBeTruthy()
    expect(button('1:45')).toBeTruthy()
  })
})

describe('Today', () => {
  it('shows an empty state with no sets today', async () => {
    await renderApp(
      memoryRepository({
        exercises: [ex('a', 'Row')],
        sets: [set('y', 'a', TODAY - DAY)],
      }),
    )
    go('Today')
    expect(screen.getByText(/No sets yet today/)).toBeTruthy()
  })

  it('lists today only, most sets first, with the day total', async () => {
    await renderApp(
      memoryRepository({
        exercises: [ex('a', 'Bench'), ex('b', 'Squat'), ex('c', 'Row')],
        sets: [
          set('1', 'a', TODAY - 3_000),
          set('2', 'b', TODAY - 2_000),
          set('3', 'b', TODAY - 1_000),
          set('4', 'c', TODAY - DAY),
        ],
      }),
    )
    go('Today')
    expect(document.querySelector('.total__count')?.textContent).toBe('3')
    const rows = [...document.querySelectorAll('.counts__row')].map(
      (r) => r.textContent,
    )
    expect(rows).toEqual(['Squat2', 'Bench1'])
  })

  it('updates live after Start on the Timer tab and after +1 / -1', async () => {
    await renderApp(memoryRepository({ exercises: [ex('a', 'Dips', 1)] }))
    fireEvent.click(button('Start'))
    go('Today')
    expect(document.querySelector('.total__count')?.textContent).toBe('1')
    go('Timer')
    fireEvent.click(button('Add a set'))
    go('Today')
    expect(document.querySelector('.total__count')?.textContent).toBe('2')
    go('Timer')
    fireEvent.click(button('Remove a set'))
    fireEvent.click(button('Remove a set'))
    go('Today')
    expect(screen.getByText(/No sets yet today/)).toBeTruthy()
  })
})

describe('History', () => {
  it('shows an empty state when there are only sets today', async () => {
    await renderApp(
      memoryRepository({
        exercises: [ex('a', 'Row')],
        sets: [set('t', 'a', TODAY)],
      }),
    )
    go('History')
    expect(screen.getByText(/No previous workouts yet/)).toBeTruthy()
  })

  it('lists previous days newest first, excluding today, and expands', async () => {
    await renderApp(
      memoryRepository({
        exercises: [ex('a', 'Bench'), ex('b', 'Squat')],
        sets: [
          set('t', 'a', TODAY),
          set('1', 'a', TODAY - 3 * DAY),
          set('2', 'b', TODAY - DAY),
          set('3', 'b', TODAY - DAY + 1),
          set('4', 'a', TODAY - DAY + 2),
        ],
      }),
    )
    go('History')
    const heads = [...document.querySelectorAll('.day__head')]
    expect(heads).toHaveLength(2)
    expect(heads[0].querySelector('.day__label')?.textContent).toBe('Yesterday')
    expect(heads[0].querySelector('.day__total')?.textContent).toBe('3 sets')
    expect(heads[1].querySelector('.day__total')?.textContent).toBe('1 set')
    expect(heads[1].querySelector('.day__label')?.textContent).toMatch(/2/)
    expect(document.querySelector('.day__body')).toBeNull()

    fireEvent.click(heads[0])
    expect(heads[0].getAttribute('aria-expanded')).toBe('true')
    const rows = [...document.querySelectorAll('.day__body .counts__row')].map(
      (r) => r.textContent,
    )
    expect(rows).toEqual(['Squat2', 'Bench1'])
    fireEvent.click(heads[0])
    expect(document.querySelector('.day__body')).toBeNull()
  })

  it('Export downloads everything as JSON via a Blob URL, then revokes it', async () => {
    const exercises = [ex('a', 'Bench')]
    const sets = [set('1', 'a', TODAY - DAY), set('2', 'a', TODAY)]
    await renderApp(memoryRepository({ exercises, sets }))
    const blobs: Blob[] = []
    const create = vi.fn((b: Blob) => {
      blobs.push(b)
      return 'blob:test/1'
    })
    const revoke = vi.fn()
    const original = [URL.createObjectURL, URL.revokeObjectURL] as const
    URL.createObjectURL = create
    URL.revokeObjectURL = revoke
    onTestFinished(() => {
      ;[URL.createObjectURL, URL.revokeObjectURL] = original
    })
    const clicked: HTMLAnchorElement[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this)
    })

    go('History')
    fireEvent.click(button('Export'))
    expect(clicked).toHaveLength(1)
    expect(clicked[0].download).toBe('gym-timer-export-2026-11-05.json')
    expect(clicked[0].getAttribute('href')).toBe('blob:test/1')
    expect(clicked[0].isConnected).toBe(false)
    expect(blobs[0].type).toBe('application/json')
    const data = JSON.parse(await blobs[0].text())
    expect(data).toEqual({
      schemaVersion: 1,
      exportedAt: new Date(TODAY).toISOString(),
      exercises,
      sets,
    })
    expect(revoke).not.toHaveBeenCalled()
    advance(0)
    expect(revoke).toHaveBeenCalledWith('blob:test/1')
  })

  it('Export is disabled with no data at all', async () => {
    await renderApp()
    go('History')
    expect((button('Export') as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('day rollover', () => {
  it('a tab switch after midnight moves today into History', async () => {
    const late = new Date(2026, 10, 5, 23, 59, 30).getTime()
    vi.setSystemTime(late)
    await renderApp(memoryRepository({ exercises: [ex('a', 'Curl', 1)] }))
    fireEvent.click(button('Start'))
    expect(document.querySelector('.badge__count')?.textContent).toBe('1')
    go('Today')
    expect(document.querySelector('.total__count')?.textContent).toBe('1')

    vi.setSystemTime(late + 60_000) // 00:00:30 the next day
    go('History')
    expect(document.querySelector('.day__label')?.textContent).toBe('Yesterday')
    go('Today')
    expect(screen.getByText(/No sets yet today/)).toBeTruthy()
    go('Timer')
    expect(document.querySelector('.badge__count')?.textContent).toBe('0')
  })

  it('becoming visible after midnight rolls the counts over', async () => {
    const late = new Date(2026, 10, 5, 23, 59).getTime()
    vi.setSystemTime(late)
    await renderApp(
      memoryRepository({
        exercises: [ex('a', 'Curl', 1)],
        sets: [set('1', 'a', late - 1_000)],
      }),
    )
    go('Today')
    expect(document.querySelector('.total__count')?.textContent).toBe('1')
    vi.setSystemTime(late + 5 * 60_000)
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(screen.getByText(/No sets yet today/)).toBeTruthy()
  })
})
