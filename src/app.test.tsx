import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/preact'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { App } from './app.tsx'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const button = (name: string | RegExp) => screen.getByRole('button', { name })
const queryButton = (name: string | RegExp) =>
  screen.queryByRole('button', { name })

test('renders presets, dial and only the idle controls', () => {
  render(<App />)
  for (const label of ['30s', '60s', '90s', '2m', 'Custom']) {
    expect(button(label)).toBeTruthy()
  }
  expect(screen.getByRole('timer').textContent).toBe('01:00')
  expect(button('Start')).toBeTruthy()
  for (const name of ['Pause', 'Resume', 'Reset', '+30s']) {
    expect(queryButton(name)).toBeNull()
  }
})

test('controls follow the timer state', () => {
  render(<App />)
  fireEvent.click(button('90s'))
  expect(screen.getByRole('timer').textContent).toBe('01:30')
  expect(button('Pause')).toBeTruthy()
  expect(button('+30s')).toBeTruthy()
  expect(button('Reset')).toBeTruthy()
  expect(queryButton('Start')).toBeNull()

  fireEvent.click(button('Pause'))
  expect(button('Resume')).toBeTruthy()
  expect(queryButton('Pause')).toBeNull()

  fireEvent.click(button('Resume'))
  act(() => {
    vi.advanceTimersByTime(91_000)
  })
  expect(screen.getByText('Done')).toBeTruthy()
  expect(screen.getByRole('timer').textContent).toBe('00:00')
  expect(button('Reset')).toBeTruthy()
  expect(queryButton('+30s')).toBeNull()
  expect(queryButton('Pause')).toBeNull()

  fireEvent.click(button('Reset'))
  expect(button('Start')).toBeTruthy()
})

const chip = (label: string) => button(label) as HTMLButtonElement

test('preset chips are disabled while running or paused', () => {
  render(<App />)
  fireEvent.click(button('90s'))
  for (const label of ['30s', '60s', '90s', '2m', 'Custom']) {
    expect(chip(label).disabled).toBe(true)
  }
  expect(chip('90s').getAttribute('aria-pressed')).toBe('true')

  fireEvent.click(button('30s'))
  expect(screen.getByRole('timer').textContent).toBe('01:30')
  expect(chip('30s').getAttribute('aria-pressed')).toBe('false')

  fireEvent.click(button('Pause'))
  expect(chip('30s').disabled).toBe(true)

  fireEvent.click(button('Reset'))
  expect(chip('30s').disabled).toBe(false)
})

test('custom time starts, then its chip restarts it in one tap after done', () => {
  render(<App />)
  fireEvent.click(button('Custom'))
  const input = screen.getByLabelText('Time (m:ss)')
  fireEvent.input(input, { target: { value: '1:45' } })
  fireEvent.click(button('Set'))
  expect(screen.getByRole('timer').textContent).toBe('01:45')
  expect(chip('1:45').getAttribute('aria-pressed')).toBe('true')
  expect(chip('Edit custom time').disabled).toBe(true)
  expect(button('Pause')).toBeTruthy()

  act(() => {
    vi.advanceTimersByTime(106_000)
  })
  expect(screen.getByText('Done')).toBeTruthy()

  fireEvent.click(button('1:45'))
  expect(screen.getByRole('timer').textContent).toBe('01:45')
  expect(button('Pause')).toBeTruthy()
  expect(screen.queryByLabelText('Time (m:ss)')).toBeNull()

  // Picking a fixed preset keeps the custom chip; the edit button reopens the input.
  fireEvent.click(button('Reset'))
  fireEvent.click(button('60s'))
  fireEvent.click(button('Reset'))
  expect(chip('1:45').getAttribute('aria-pressed')).toBe('false')
  fireEvent.click(button('Edit custom time'))
  fireEvent.input(screen.getByLabelText('Time (m:ss)'), {
    target: { value: '0:40' },
  })
  fireEvent.click(button('Set'))
  expect(screen.getByRole('timer').textContent).toBe('00:40')
  expect(queryButton('1:45')).toBeNull()
  expect(chip('40s').getAttribute('aria-pressed')).toBe('true')
})
