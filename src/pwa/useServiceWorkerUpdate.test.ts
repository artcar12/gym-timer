import { act, cleanup, renderHook } from '@testing-library/preact'
import { afterEach, expect, it, vi } from 'vitest'
import {
  useServiceWorkerUpdate,
  type GateStatus,
  type RegisterSW,
} from './useServiceWorkerUpdate.ts'

afterEach(cleanup)

/** A fake registration that lets the test say when the new worker takes over. */
function fakeRegistration() {
  let onNeedReload: (() => void) | undefined
  const register = vi.fn<RegisterSW>((opts) => {
    onNeedReload = opts.onNeedReload
  })
  return { register, activate: () => act(() => onNeedReload?.()) }
}

function setup(status: GateStatus) {
  const sw = fakeRegistration()
  const reload = vi.fn()
  const hook = renderHook(
    (p: { status: GateStatus }) =>
      useServiceWorkerUpdate({
        register: sw.register,
        status: p.status,
        reload,
      }),
    { initialProps: { status } },
  )
  return { ...sw, reload, hook }
}

it('registers once and does nothing before an update', () => {
  const { register, reload, hook } = setup('idle')
  hook.rerender({ status: 'running' })
  expect(register).toHaveBeenCalledTimes(1)
  expect(hook.result.current.updateAvailable).toBe(false)
  hook.result.current.applyUpdate()
  expect(reload).not.toHaveBeenCalled()
})

it('never reloads by itself, even when idle', () => {
  const { activate, reload, hook } = setup('idle')
  activate()
  expect(reload).not.toHaveBeenCalled()
  expect(hook.result.current.updateAvailable).toBe(true)
  hook.result.current.applyUpdate()
  expect(reload).toHaveBeenCalledTimes(1)
})

it.each<GateStatus>(['running', 'paused'])(
  'hides the update and refuses to reload while %s',
  (status) => {
    const { activate, reload, hook } = setup(status)
    activate()
    expect(hook.result.current.updateAvailable).toBe(false)
    hook.result.current.applyUpdate()
    expect(reload).not.toHaveBeenCalled()
  },
)

it('offers the update once the timer is reset or done, and hides it on restart', () => {
  const { activate, reload, hook } = setup('running')
  activate()
  expect(hook.result.current.updateAvailable).toBe(false)
  hook.rerender({ status: 'done' })
  expect(hook.result.current.updateAvailable).toBe(true)
  hook.rerender({ status: 'idle' })
  expect(hook.result.current.updateAvailable).toBe(true)
  const stale = hook.result.current.applyUpdate
  hook.rerender({ status: 'running' })
  expect(hook.result.current.updateAvailable).toBe(false)
  // A handler captured while idle still checks the current status.
  stale()
  expect(reload).not.toHaveBeenCalled()
})

it('works without a registration (tests, dev server)', () => {
  const reload = vi.fn()
  const { result } = renderHook(() =>
    useServiceWorkerUpdate({ status: 'idle', reload }),
  )
  expect(result.current.updateAvailable).toBe(false)
})
