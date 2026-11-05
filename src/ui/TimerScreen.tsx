import { Controls } from './Controls.tsx'
import { Dial } from './Dial.tsx'
import { PresetChips } from './PresetChips.tsx'
import { useTimer, type UseTimerOptions } from './useTimer.ts'

export function TimerScreen(props: UseTimerOptions) {
  const timer = useTimer(props)
  return (
    <main class="screen">
      <h1 class="screen__title">Gym Timer</h1>
      <PresetChips
        selectedMs={timer.selectedMs}
        onSelect={timer.selectPreset}
        enabled={timer.canSelectPreset}
      />
      <Dial
        display={timer.display}
        progress={timer.progress}
        status={timer.status}
      />
      <Controls timer={timer} />
    </main>
  )
}
