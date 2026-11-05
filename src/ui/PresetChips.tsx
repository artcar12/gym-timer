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
}) {
  const { selectedMs, onSelect } = props
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const isPreset = (PRESETS_MS as readonly number[]).includes(selectedMs)
  const customMs = isPreset ? null : selectedMs
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
            onClick={() => onSelect(ms)}
          >
            {presetLabel(ms)}
          </button>
        ))}
        <button
          type="button"
          class="chip"
          aria-pressed={customMs !== null}
          aria-expanded={editing}
          onClick={() => setEditing((v) => !v)}
        >
          {customMs !== null ? presetLabel(customMs) : 'Custom'}
        </button>
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
