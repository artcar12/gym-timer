/** Whole seconds shown for `ms`: rounded up, so 9.001s shows as 10. */
export function displaySeconds(ms: number): number {
  return Math.max(0, Math.ceil(ms / 1000))
}

/** `mm:ss` for `ms`, ceiling to whole seconds. Minutes are not capped at 59. */
export function formatMs(ms: number): string {
  const s = displaySeconds(ms)
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

/** Short chip label: `30s`, `90s`, `2m`, `1:45`. */
export function presetLabel(ms: number): string {
  const s = displaySeconds(ms)
  if (s <= 90) return `${s}s`
  if (s % 60 === 0) return `${s / 60}m`
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
