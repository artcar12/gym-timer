import { idbRepository, type Repository } from './data/index.ts'
import { TimerScreen } from './ui/TimerScreen.tsx'

// Opens IndexedDB lazily on first use, so importing this is side-effect free.
const defaultRepo = idbRepository()

export function App(props: { repo?: Repository }) {
  return <TimerScreen repo={props.repo ?? defaultRepo} />
}
