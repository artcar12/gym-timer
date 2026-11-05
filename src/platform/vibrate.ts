export interface Vibrator {
  vibrate(pattern: number[]): void
  cancel(): void
}

/** `navigator.vibrate`; a no-op where unsupported (iOS, desktop, jsdom). */
export function createVibrator(
  nav: Pick<Navigator, 'vibrate'> | undefined = globalThis.navigator,
): Vibrator {
  const call = (pattern: number | number[]) => {
    try {
      if (typeof nav?.vibrate === 'function') nav.vibrate(pattern)
    } catch {
      // Blocked without user activation in some browsers; nothing to do.
    }
  }
  return {
    vibrate: (pattern) => call(pattern),
    cancel: () => call(0),
  }
}
