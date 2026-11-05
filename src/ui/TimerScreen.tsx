import type { Repository } from '../data/index.ts'
import { Controls } from './Controls.tsx'
import { Dial } from './Dial.tsx'
import { ExerciseChips } from './ExerciseChips.tsx'
import { PresetChips } from './PresetChips.tsx'
import { SetBadge } from './SetBadge.tsx'
import { useTimer, type UseTimerOptions } from './useTimer.ts'
import { useWorkout } from './useWorkout.ts'

export interface TimerScreenProps extends Omit<UseTimerOptions, 'onStarted'> {
  /** Exercise and set storage. Must be a stable reference. */
  repo: Repository
}

export function TimerScreen(props: TimerScreenProps) {
  const { repo, ...timerOptions } = props
  const workout = useWorkout({ repo, now: timerOptions.now })
  // A start = a set: recorded from the Start / preset tap handler itself.
  const timer = useTimer({ ...timerOptions, onStarted: workout.recordSet })
  const selected = workout.selected
  return (
    <main class="screen">
      <h1 class="screen__title">Gym Timer</h1>
      <ExerciseChips
        loaded={workout.loaded}
        exercises={workout.recent}
        selectedId={selected?.id ?? null}
        onSelect={workout.select}
        onCreate={workout.create}
      />
      <PresetChips
        selectedMs={timer.selectedMs}
        onSelect={timer.selectPreset}
        enabled={timer.canSelectPreset}
      />
      <Dial
        display={timer.display}
        progress={timer.progress}
        status={timer.status}
        alarming={timer.alarming}
        onDismiss={timer.dismiss}
      />
      {workout.loaded && selected && (
        <SetBadge
          exerciseName={selected.name}
          count={workout.todayCount}
          onIncrement={() => workout.recordSet(timer.selectedMs)}
          onDecrement={workout.removeLatestToday}
        />
      )}
      <Controls timer={timer} />
    </main>
  )
}
