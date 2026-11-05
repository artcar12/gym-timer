/** Keeps the screen on. Both calls are idempotent and never throw. */
export interface WakeLock {
  acquire(): void
  release(): void
}

interface Sentinel {
  /** Missing before Chrome 87; the `release` event is the reliable signal. */
  readonly released?: boolean
  release(): Promise<void>
  addEventListener?(type: 'release', listener: () => void): void
}

interface WakeLockApi {
  request(type: 'screen'): Promise<Sentinel>
}

/**
 * Screen Wake Lock API. Failures (unsupported, denied, document hidden) are
 * swallowed and reported through `log` at most once per adapter.
 */
export function createWakeLock(
  nav: { wakeLock?: WakeLockApi } | undefined = globalThis.navigator as
    { wakeLock?: WakeLockApi } | undefined,
  log: (message: string, error: unknown) => void = (m, e) => console.warn(m, e),
): WakeLock {
  let sentinel: Sentinel | null = null
  let pending = false
  // Whether the caller currently wants the lock; a request that resolves
  // after release() is released straight away.
  let wanted = false
  let logged = false

  const fail = (error: unknown) => {
    if (logged) return
    logged = true
    log('Screen wake lock unavailable:', error)
  }
  const drop = (s: Sentinel) => {
    if (s.released !== true) s.release().catch(() => {})
  }
  const hold = (s: Sentinel) => {
    sentinel = s
    // The browser releases the lock itself when the page is hidden.
    s.addEventListener?.('release', () => {
      if (sentinel === s) sentinel = null
    })
  }

  return {
    acquire() {
      wanted = true
      if (pending || (sentinel && sentinel.released !== true)) return
      const api = nav?.wakeLock
      if (!api || typeof api.request !== 'function') {
        fail(new Error('Screen Wake Lock API not supported'))
        return
      }
      pending = true
      let request: Promise<Sentinel>
      try {
        request = api.request('screen')
      } catch (e) {
        pending = false
        fail(e)
        return
      }
      Promise.resolve(request).then(
        (s) => {
          pending = false
          if (wanted) hold(s)
          else drop(s)
        },
        (e) => {
          pending = false
          fail(e)
        },
      )
    },
    release() {
      wanted = false
      const s = sentinel
      sentinel = null
      if (s) drop(s)
    },
  }
}
