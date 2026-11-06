import { useState } from 'preact/hooks'
import type { Repository } from '../data/index.ts'
import {
  useInstallPrompt,
  useServiceWorkerUpdate,
  type InstallEnv,
  type RegisterSW,
} from '../pwa/index.ts'
import { HistoryScreen } from './HistoryScreen.tsx'
import { TabBar, type Tab, type TimerBadge } from './TabBar.tsx'
import { TimerScreen } from './TimerScreen.tsx'
import { TodayScreen } from './TodayScreen.tsx'
import { useTimer, type TimerView, type UseTimerOptions } from './useTimer.ts'
import { useWorkout } from './useWorkout.ts'

export interface AppShellProps extends Omit<UseTimerOptions, 'onStarted'> {
  /** Exercise and set storage. Must be a stable reference. */
  repo: Repository
  initialTab?: Tab
  /** Registers the service worker. Omitted in tests and dev: no registration. */
  registerSW?: RegisterSW
  /** Window stand-in for the install prompt. Must be a stable reference. */
  installEnv?: InstallEnv
  /** Page reload used to apply an update. */
  reload?: () => void
}

function timerBadge(timer: TimerView): TimerBadge | null {
  if (timer.status === 'idle') return null
  if (timer.status === 'done') return { text: 'Done', alarming: timer.alarming }
  return { text: timer.display, alarming: false }
}

/**
 * Owns the timer, the workout data and the active tab. Both hooks live here,
 * above the tab switch, so changing tabs never resets, pauses or stops the
 * timer: it keeps counting, reaches done and rings the alarm on any tab.
 * The Timer screen stays mounted (hidden) so its own UI state, such as a
 * remembered custom time, also survives; Today and History mount on demand.
 */
export function AppShell(props: AppShellProps) {
  const {
    repo,
    initialTab = 'timer',
    registerSW,
    installEnv,
    reload,
    ...timerOptions
  } = props
  const now = timerOptions.now ?? Date.now
  const workout = useWorkout({ repo, now })
  // A start = a set: recorded from the Start / preset tap handler itself.
  const timer = useTimer({ ...timerOptions, onStarted: workout.recordSet })
  const [tab, setTab] = useState<Tab>(initialTab)
  const install = useInstallPrompt(installEnv)
  // A new version never reloads the page while the timer is running or paused.
  const update = useServiceWorkerUpdate({
    register: registerSW,
    status: timer.status,
    reload,
  })

  const select = (next: Tab) => {
    workout.refreshDay()
    setTab(next)
  }

  return (
    <div class="shell">
      <div hidden={tab !== 'timer'}>
        <TimerScreen
          timer={timer}
          workout={workout}
          install={install}
          update={update}
        />
      </div>
      {tab === 'today' && <TodayScreen workout={workout} />}
      {tab === 'history' && <HistoryScreen workout={workout} now={now} />}
      <TabBar active={tab} onSelect={select} timerBadge={timerBadge(timer)} />
    </div>
  )
}
