/** Alarm sound. All calls are cheap, idempotent where it matters, and never throw. */
export interface AlarmAudio {
  /**
   * Create or resume the AudioContext. Must be called synchronously inside a
   * user gesture handler (Start / preset tap), or mobile browsers keep it muted.
   */
  unlock(): void
  /** Play one short beep pattern (well under a second). */
  beep(): void
  /** Silence anything still playing. */
  stop(): void
}

type AudioContextCtor = new () => AudioContext

const BEEP_HZ = 880
const BEEP_S = 0.15
const BEEP_GAP_S = 0.1
const BEEPS = 3
const GAIN = 0.4

function findAudioContext(): AudioContextCtor | undefined {
  const g = globalThis as {
    AudioContext?: AudioContextCtor
    webkitAudioContext?: AudioContextCtor
  }
  return g.AudioContext ?? g.webkitAudioContext
}

/** Web Audio beeps; a no-op where `AudioContext` is missing (jsdom, old browsers). */
export function createWebAudio(
  Ctor: AudioContextCtor | undefined = findAudioContext(),
): AlarmAudio {
  let ctx: AudioContext | null = null
  const playing = new Set<OscillatorNode>()

  const resume = (c: AudioContext) => {
    if (c.state === 'suspended') c.resume().catch(() => {})
  }

  return {
    unlock() {
      if (!Ctor) return
      try {
        if (!ctx) {
          ctx = new Ctor()
          // Some browsers only unlock once a sound has started inside the
          // gesture: play one silent sample.
          const src = ctx.createBufferSource()
          src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
          src.connect(ctx.destination)
          src.start(0)
        }
        resume(ctx)
      } catch {
        // Leave ctx as is; beep() stays a no-op without a context.
      }
    },
    beep() {
      const c = ctx
      if (!c) return
      try {
        resume(c)
        const t0 = c.currentTime
        for (let i = 0; i < BEEPS; i++) {
          const start = t0 + i * (BEEP_S + BEEP_GAP_S)
          const osc = c.createOscillator()
          const gain = c.createGain()
          osc.type = 'square'
          osc.frequency.value = BEEP_HZ
          // Short ramps avoid clicks at the edges.
          gain.gain.setValueAtTime(0, start)
          gain.gain.linearRampToValueAtTime(GAIN, start + 0.01)
          gain.gain.setValueAtTime(GAIN, start + BEEP_S - 0.01)
          gain.gain.linearRampToValueAtTime(0, start + BEEP_S)
          osc.connect(gain).connect(c.destination)
          osc.onended = () => playing.delete(osc)
          playing.add(osc)
          osc.start(start)
          osc.stop(start + BEEP_S)
        }
      } catch {
        // Ignore; the visual alarm and vibration still run.
      }
    },
    stop() {
      for (const osc of playing) {
        try {
          osc.stop()
        } catch {
          // Already stopped.
        }
      }
      playing.clear()
    },
  }
}
