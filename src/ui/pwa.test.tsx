import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/preact'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { App } from '../app.tsx'
import { memoryRepository } from '../data/index.ts'
import type { RegisterSW } from '../pwa/index.ts'
import { fakeInstallEnv, fakePromptEvent } from '../pwa/testing.ts'

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

it('shows an Install button on the Timer screen that prompts, and Not now hides it for good', () => {
  const { env, target, store } = fakeInstallEnv()
  render(<App repo={memoryRepository()} installEnv={env} />)
  expect(queryButton('Install')).toBeNull()

  const fake = fakePromptEvent()
  act(() => void target.dispatchEvent(fake.event))
  fireEvent.click(button('Install'))
  expect(fake.prompts()).toBe(1)
  expect(queryButton('Install')).toBeNull()

  act(() => void target.dispatchEvent(fakePromptEvent().event))
  fireEvent.click(button('Not now'))
  expect(queryButton('Install')).toBeNull()
  expect(store.size).toBe(1)
})

it('never reloads for an update while the timer runs; offers Reload once reset', () => {
  let activate = () => {}
  const registerSW: RegisterSW = (o) => {
    activate = () => o.onNeedReload?.()
  }
  const reload = vi.fn()
  render(
    <App repo={memoryRepository()} registerSW={registerSW} reload={reload} />,
  )
  fireEvent.click(button('Start'))
  act(() => activate())
  expect(screen.queryByText('Update available')).toBeNull()
  expect(queryButton('Reload')).toBeNull()

  fireEvent.click(button('Pause'))
  expect(queryButton('Reload')).toBeNull()

  fireEvent.click(button('Reset'))
  fireEvent.click(button('Reload'))
  expect(reload).toHaveBeenCalledTimes(1)
})
