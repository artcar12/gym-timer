/**
 * One-shot timeouts. Unlike the frame loop these keep firing (throttled) in a
 * hidden tab, so done detection and the alarm repeat use them.
 */
export interface Timeouts {
  set(cb: () => void, ms: number): number
  clear(handle: number): void
}

/** `setTimeout`, looked up at call time so test fake timers apply. */
export const browserTimeouts: Timeouts = {
  set: (cb, ms) => globalThis.setTimeout(cb, ms) as unknown as number,
  clear: (h) => globalThis.clearTimeout(h),
}
