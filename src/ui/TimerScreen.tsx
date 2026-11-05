import { Controls } from './Controls.tsx'
import { Dial } from './Dial.tsx'
import { ExerciseChips } from './ExerciseChips.tsx'
import { PresetChips } from './PresetChips.tsx'
import { SetBadge } from './SetBadge.tsx'
import type { TimerView } from './useTimer.ts'
import type { WorkoutView } from './useWorkout.ts'

/**
 * The main screen: a view of timer and workout state owned by the shell, so
 * nothing here resets when the user switches tabs.
 */
export function TimerScreen(props: { timer: TimerView; workout: WorkoutView }) {
  const { timer, workout } = props
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
