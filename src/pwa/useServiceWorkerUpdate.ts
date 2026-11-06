import { useCallback, useEffect, useRef, useState } from 'preact/hooks'

/**
 * Registers the service worker. `onNeedReload` fires once a new worker has
 * activated (registerType autoUpdate: it skips waiting instead of waiting
 * for every tab to close). The default is `registerSW` from virtual:pwa-register,
 * wired in src/main.tsx; tests pass a fake.
 */
export type RegisterSW = (options: {
  onNeedReload?: () => void
  onRegisterError?: (error: unknown) => void
}) => unknown

/** Timer status that gates the reload; only idle and done may reload. */
export type GateStatus = 'idle' | 'running' | 'paused' | 'done'

export interface UseServiceWorkerUpdateOptions {
  /** Called once on mount. Omit to skip registration (tests, dev). */
  register?: RegisterSW
  /** Current timer status. Running or paused hides the update action. */
  status: GateStatus
  /** Reloads the page. Defaults to `location.reload()`. */
  reload?: () => void
}

export interface ServiceWorkerUpdate {
  /** A new version is active and the timer is idle or done. */
  updateAvailable: boolean
  /** Reloads into the new version. A no-op while the timer is running or paused. */
  applyUpdate: () => void
}

const isIdle = (s: GateStatus) => s === 'idle' || s === 'done'

/**
 * Never reloads on its own. When a new service worker takes control, the
 * running page keeps working on the code it already loaded; the new version
 * shows on the next launch, or now through `applyUpdate`, which is offered
 * only while the timer is idle or done.
 */
export function useServiceWorkerUpdate(
  options: UseServiceWorkerUpdateOptions,
): ServiceWorkerUpdate {
  const { register, status, reload = () => location.reload() } = options
  const [ready, setReady] = useState(false)
  // Registration runs once; later register props are ignored.
  const registerRef = useRef(register)

  useEffect(() => {
    registerRef.current?.({
      onNeedReload: () => setReady(true),
      onRegisterError: (e) =>
        console.warn('Service worker registration failed', e),
    })
  }, [])

  const statusRef = useRef(status)
  statusRef.current = status
  const reloadRef = useRef(reload)
  reloadRef.current = reload

  const applyUpdate = useCallback(() => {
    if (isIdle(statusRef.current)) reloadRef.current()
  }, [])

  return { updateAvailable: ready && isIdle(status), applyUpdate }
}
