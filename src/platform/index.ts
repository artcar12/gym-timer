/** Browser side effects behind small injectable adapters with no-op fallbacks. */
export { createWebAudio, type AlarmAudio } from './audio.ts'
export { browserTimeouts, type Timeouts } from './timeouts.ts'
export { createVibrator, type Vibrator } from './vibrate.ts'
export { createWakeLock, type WakeLock } from './wakeLock.ts'
