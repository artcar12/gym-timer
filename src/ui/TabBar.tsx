import { Icon, type IconName } from './icons.tsx'

export type Tab = 'timer' | 'today' | 'history'

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'timer', label: 'Timer', icon: 'timer' },
  { id: 'today', label: 'Today', icon: 'today' },
  { id: 'history', label: 'History', icon: 'history' },
]

/** What the Timer tab shows while another tab is open. */
export interface TimerBadge {
  /** `mm:ss` while running or paused, "Done" when finished. */
  text: string
  /** Done and not dismissed: drawn in the alarm colour and pulsing. */
  alarming: boolean
}

/** Material 3 navigation bar. The Timer tab carries a badge for a live timer. */
export function TabBar(props: {
  active: Tab
  onSelect: (tab: Tab) => void
  timerBadge: TimerBadge | null
}) {
  const { active, onSelect, timerBadge } = props
  return (
    <nav class="nav" aria-label="Main">
      {TABS.map((t) => {
        const badge = t.id === 'timer' && active !== 'timer' ? timerBadge : null
        return (
          <button
            key={t.id}
            type="button"
            class="nav__item"
            aria-current={t.id === active ? 'page' : undefined}
            onClick={() => onSelect(t.id)}
          >
            <span class="nav__indicator">
              <Icon name={t.icon} />
              {badge && (
                <span
                  class={`nav__badge${badge.alarming ? ' nav__badge--alarm' : ''}`}
                >
                  {badge.text}
                </span>
              )}
            </span>
            <span class="nav__label">{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
