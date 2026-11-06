import type {
  BeforeInstallPromptEvent,
  InstallEnv,
} from './useInstallPrompt.ts'

/** A fake window for useInstallPrompt: events, matchMedia and storage. */
export function fakeInstallEnv(
  opts: { standalone?: boolean; stored?: string } = {},
) {
  const target = new EventTarget()
  const store = new Map<string, string>()
  if (opts.stored !== undefined)
    store.set('gym-timer:install-dismissed', opts.stored)
  const env: InstallEnv = {
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    matchMedia: (query: string) =>
      ({
        matches: query === '(display-mode: standalone)' && !!opts.standalone,
        media: query,
      }) as MediaQueryList,
    navigator: {},
    localStorage: {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => void store.set(k, v),
    },
  }
  return { env, target, store }
}

/** A fake beforeinstallprompt event whose dialog resolves with `outcome`. */
export function fakePromptEvent(
  outcome: 'accepted' | 'dismissed' = 'accepted',
) {
  const event = new Event('beforeinstallprompt', { cancelable: true })
  let prompts = 0
  Object.assign(event, {
    prompt: async () => {
      prompts++
    },
    userChoice: Promise.resolve({ outcome }),
  })
  return {
    event: event as BeforeInstallPromptEvent,
    prompts: () => prompts,
  }
}
