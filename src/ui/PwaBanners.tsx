import type { InstallPrompt, ServiceWorkerUpdate } from '../pwa/index.ts'

/** Non-blocking install and update offers at the top of the Timer screen. */
export function PwaBanners(props: {
  install: InstallPrompt
  update: ServiceWorkerUpdate
}) {
  const { install, update } = props
  return (
    <>
      {update.updateAvailable && (
        <div class="banner" role="status">
          <span class="banner__text">Update available</span>
          <button
            type="button"
            class="btn btn--text"
            onClick={update.applyUpdate}
          >
            Reload
          </button>
        </div>
      )}
      {install.canInstall && (
        <div class="banner" role="region" aria-label="Install app">
          <span class="banner__text">Install Gym Timer on this device</span>
          <div class="banner__actions">
            <button
              type="button"
              class="btn btn--text"
              onClick={install.dismiss}
            >
              Not now
            </button>
            <button
              type="button"
              class="btn btn--filled"
              onClick={() => void install.install()}
            >
              Install
            </button>
          </div>
        </div>
      )}
    </>
  )
}
