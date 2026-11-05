import { idbRepository, type Repository } from './data/index.ts'
import { AppShell, type AppShellProps } from './ui/AppShell.tsx'

// Opens IndexedDB lazily on first use, so importing this is side-effect free.
const defaultRepo = idbRepository()

export function App(props: Partial<AppShellProps> & { repo?: Repository }) {
  return <AppShell {...props} repo={props.repo ?? defaultRepo} />
}
