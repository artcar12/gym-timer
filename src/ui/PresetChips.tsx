import { useEffect, useRef, useState } from 'preact/hooks'
import { presetLabel } from './format.ts'
import { PRESETS_MS } from './useTimer.ts'

/**
 * Parse `m:ss` (or `m.ss`, since Android numeric keypads have no colon) or
 * plain seconds into ms; null if not a positive time.
 */
export function parseCustom(text: string): number | null {
  const m = /^\s*(?:(\d{1,3})[:.])?(\d{1,4})\s*$/.exec(text)
  if (!m) return null
  const min = m[1] ? Number(m[1]) : 0
  const sec = Number(m[2])
  if (m[1] && sec > 59) return null
  const ms = (min * 60 + sec) * 1000
  return ms > 0 ? ms : null
}

export function PresetChips(props: {
  selectedMs: number
  onSelect: (ms: number) => void
  /** False while running or paused: chips are shown but not tappable. */
  enabled: boolean
}) {
  const { selectedMs, onSelect, enabled } = props
  const isPreset = (PRESETS_MS as readonly number[]).includes(selectedMs)
  // Remembered custom duration; survives picking a fixed preset in between.
  const [customMs, setCustomMs] = useState<number | null>(
    isPreset ? null : selectedMs,
  )
  const [editingState, setEditing] = useState(false)
  const editing = editingState && enabled
  const [text, setText] = useState('')
  const parsed = parseCustom(text)
  const inputRef = useRef<HTMLInputElement>(null)

  // autoFocus only applies on page load, so focus the input when it opens.
  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const submit = (e: Event) => {
    e.preventDefault()
    if (parsed === null) return
    setEditing(false)
    setText('')
    if (!(PRESETS_MS as readonly number[]).includes(parsed)) setCustomMs(parsed)
    onSelect(parsed)
  }

  return (
    <div class="presets">
      <div class="chips" role="group" aria-label="Presets">
        {PRESETS_MS.map((ms) => (
          <button
            key={ms}
            type="button"
            class="chip"
            aria-pressed={selectedMs === ms}
            disabled={!enabled}
            onClick={() => onSelect(ms)}
          >
            {presetLabel(ms)}
          </button>
        ))}
        {customMs !== null ? (
          <span class="chip-split">
            <button
              type="button"
              class="chip chip--lead"
              aria-pressed={selectedMs === customMs}
              disabled={!enabled}
              onClick={() => onSelect(customMs)}
            >
              {presetLabel(customMs)}
            </button>
            <button
              type="button"
              class="chip chip--trail"
              aria-label="Edit custom time"
              aria-expanded={editing}
              disabled={!enabled}
              onClick={() => setEditing((v) => !v)}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-10.21a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                />
              </svg>
            </button>
          </span>
        ) : (
          <button
            type="button"
            class="chip"
            aria-expanded={editing}
            disabled={!enabled}
            onClick={() => setEditing((v) => !v)}
          >
            Custom
          </button>
        )}
      </div>
      {editing && (
        <form class="custom" onSubmit={submit}>
          <label class="custom__label" for="custom-time">
            Time (m:ss)
          </label>
          <input
            ref={inputRef}
            id="custom-time"
            class="custom__input"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="1:45"
            value={text}
            onInput={(e) => setText(e.currentTarget.value)}
          />
          <button
            type="submit"
            class="btn btn--tonal"
            disabled={parsed === null}
          >
            Set
          </button>
        </form>
      )}
    </div>
  )
}
