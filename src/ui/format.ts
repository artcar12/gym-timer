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

/** Local midnight of a `YYYY-MM-DD` day key. */
function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * History row label: "Yesterday", else a short date such as "Tue, 3 Nov",
 * with the year only when it differs from today's.
 */
export function dayLabel(day: string, today: string, locale?: string): string {
  const date = parseDay(day)
  const now = parseDay(today)
  const prev = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (date.getTime() === prev.getTime()) return 'Yesterday'
  return date.toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
  })
}

/** "1 set", "3 sets". */
export function setsLabel(n: number): string {
  return `${n} ${n === 1 ? 'set' : 'sets'}`
}
