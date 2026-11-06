import { act, cleanup, renderHook } from '@testing-library/preact'
import { afterEach, expect, it } from 'vitest'
import { fakeInstallEnv, fakePromptEvent } from './testing.ts'
import { DISMISS_KEY, useInstallPrompt } from './useInstallPrompt.ts'

afterEach(cleanup)

it('offers nothing until the browser fires beforeinstallprompt', () => {
  const { env } = fakeInstallEnv()
  const { result } = renderHook(() => useInstallPrompt(env))
  expect(result.current.canInstall).toBe(false)
})

it('captures the event, suppresses the mini-infobar and prompts on install', async () => {
  const { env, target } = fakeInstallEnv()
  const { result } = renderHook(() => useInstallPrompt(env))
  const fake = fakePromptEvent('accepted')
  act(() => void target.dispatchEvent(fake.event))
  expect(fake.event.defaultPrevented).toBe(true)
  expect(result.current.canInstall).toBe(true)

  await act(() => result.current.install())
  expect(fake.prompts()).toBe(1)
  expect(result.current.canInstall).toBe(false)
})

it('remembers an in-app dismissal in localStorage', () => {
  const { env, target, store } = fakeInstallEnv()
  const { result } = renderHook(() => useInstallPrompt(env))
  act(() => void target.dispatchEvent(fakePromptEvent().event))
  act(() => result.current.dismiss())
  expect(result.current.canInstall).toBe(false)
  expect(store.get(DISMISS_KEY)).toBe('1')
})

it('treats declining the browser dialog as a dismissal', async () => {
  const { env, target, store } = fakeInstallEnv()
  const { result } = renderHook(() => useInstallPrompt(env))
  act(() => void target.dispatchEvent(fakePromptEvent('dismissed').event))
  await act(() => result.current.install())
  expect(store.get(DISMISS_KEY)).toBe('1')
  // A later event (next visit) is not offered either.
  act(() => void target.dispatchEvent(fakePromptEvent().event))
  expect(result.current.canInstall).toBe(false)
})

it('stays hidden after an earlier dismissal', () => {
  const { env, target } = fakeInstallEnv({ stored: '1' })
  const { result } = renderHook(() => useInstallPrompt(env))
  act(() => void target.dispatchEvent(fakePromptEvent().event))
  expect(result.current.canInstall).toBe(false)
})

it('shows nothing when running installed (display-mode standalone)', () => {
  const { env, target } = fakeInstallEnv({ standalone: true })
  const { result } = renderHook(() => useInstallPrompt(env))
  act(() => void target.dispatchEvent(fakePromptEvent().event))
  expect(result.current.canInstall).toBe(false)
})

it('shows nothing on an iOS home-screen launch', () => {
  const { env, target } = fakeInstallEnv()
  env.navigator = { standalone: true }
  const { result } = renderHook(() => useInstallPrompt(env))
  act(() => void target.dispatchEvent(fakePromptEvent().event))
  expect(result.current.canInstall).toBe(false)
})

it('hides the offer once the app is installed from the browser menu', () => {
  const { env, target } = fakeInstallEnv()
  const { result } = renderHook(() => useInstallPrompt(env))
  act(() => void target.dispatchEvent(fakePromptEvent().event))
  act(() => void target.dispatchEvent(new Event('appinstalled')))
  expect(result.current.canInstall).toBe(false)
})

it('works without matchMedia or storage', () => {
  const { env, target } = fakeInstallEnv()
  delete env.matchMedia
  delete env.localStorage
  const { result } = renderHook(() => useInstallPrompt(env))
  act(() => void target.dispatchEvent(fakePromptEvent().event))
  expect(result.current.canInstall).toBe(true)
  act(() => result.current.dismiss())
  expect(result.current.canInstall).toBe(false)
})

it('removes its listeners on unmount', () => {
  const { env, target } = fakeInstallEnv()
  const { unmount } = renderHook(() => useInstallPrompt(env))
  act(() => unmount())
  const fake = fakePromptEvent()
  target.dispatchEvent(fake.event)
  expect(fake.event.defaultPrevented).toBe(false)
})
