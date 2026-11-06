import { useCallback, useEffect, useState } from 'preact/hooks'

/** Chromium's install prompt event (not in lib.dom). */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<unknown>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** The parts of `window` the hook uses, injectable for tests. */
export interface InstallEnv {
  addEventListener: Window['addEventListener']
  removeEventListener: Window['removeEventListener']
  matchMedia?: Window['matchMedia']
  /** `navigator.standalone` is true on an iOS home-screen launch. */
  navigator?: object
  localStorage?: Pick<Storage, 'getItem' | 'setItem'>
}

export interface InstallPrompt {
  /** The browser offered installation and the user has not declined it. */
  canInstall: boolean
  /** Shows the browser's install dialog. */
  install: () => Promise<void>
  /** Hides the affordance for good on this device. */
  dismiss: () => void
}

export const DISMISS_KEY = 'gym-timer:install-dismissed'

function isStandalone(env: InstallEnv): boolean {
  const nav = env.navigator as { standalone?: boolean } | undefined
  if (nav?.standalone) return true // iOS home screen
  return env.matchMedia?.('(display-mode: standalone)').matches ?? false
}

function readDismissed(env: InstallEnv): boolean {
  try {
    return env.localStorage?.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Captures `beforeinstallprompt` so the app can offer its own Install button.
 * Reports nothing when already installed, after a dismissal (remembered in
 * localStorage), or on browsers that never fire the event (Safari, Firefox).
 */
export function useInstallPrompt(env: InstallEnv = window): InstallPrompt {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() => readDismissed(env))
  const [standalone] = useState(() => isStandalone(env))

  useEffect(() => {
    const onPrompt = (e: Event) => {
      // Keep the browser's mini-infobar away; our button replaces it.
      e.preventDefault()
      setEvent(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setEvent(null)
    env.addEventListener('beforeinstallprompt', onPrompt)
    env.addEventListener('appinstalled', onInstalled)
    return () => {
      env.removeEventListener('beforeinstallprompt', onPrompt)
      env.removeEventListener('appinstalled', onInstalled)
    }
  }, [env])

  const remember = useCallback(() => {
    setDismissed(true)
    try {
      env.localStorage?.setItem(DISMISS_KEY, '1')
    } catch {
      // Storage full or blocked: the dismissal lasts for this session only.
    }
  }, [env])

  const install = useCallback(async () => {
    if (!event) return
    // An event can prompt only once.
    setEvent(null)
    await event.prompt()
    const { outcome } = await event.userChoice
    if (outcome === 'dismissed') remember()
  }, [event, remember])

  return {
    canInstall: event !== null && !dismissed && !standalone,
    install,
    dismiss: remember,
  }
}
