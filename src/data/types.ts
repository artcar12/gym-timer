/** Something the user trains, e.g. "Bench press". */
export interface Exercise {
  readonly id: string
  readonly name: string
  /** Clock value (ms, Date.now) when it was last selected or created. */
  readonly lastUsed: number
}

/** One timer start for an exercise. Counts and history derive from these. */
export interface SetRecord {
  readonly id: string
  readonly exerciseId: string
  /** Clock value (ms, Date.now) of the Start or preset tap. */
  readonly startedAt: number
  /** Duration the timer was started with, in whole seconds. */
  readonly durationS: number
}

/** Local calendar date `YYYY-MM-DD`; a workout is one such day. */
export type DayKey = string
