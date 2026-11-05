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

test('custom time selects and starts', () => {
  render(<App />)
  fireEvent.click(button('Custom'))
  const input = screen.getByLabelText('Time (m:ss)')
  fireEvent.input(input, { target: { value: '1:45' } })
  fireEvent.click(button('Set'))
  expect(screen.getByRole('timer').textContent).toBe('01:45')
  expect(button('1:45').getAttribute('aria-pressed')).toBe('true')
  expect(button('Pause')).toBeTruthy()
})
