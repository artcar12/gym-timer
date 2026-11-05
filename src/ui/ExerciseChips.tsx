import { useEffect, useRef, useState } from 'preact/hooks'
import type { Exercise } from '../data/index.ts'

/**
 * Recent-exercise chips plus "+ New", which opens an inline name input.
 * Before stored data has loaded the row only reserves its space.
 */
export function ExerciseChips(props: {
  loaded: boolean
  exercises: Exercise[]
  selectedId: string | null
  onSelect: (id: string) => void
  onCreate: (name: string) => void
}) {
  const { loaded, exercises, selectedId, onSelect, onCreate } = props
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  if (!loaded) return <div class="exercises" aria-busy="true" />

  const submit = (e: Event) => {
    e.preventDefault()
    if (!name.trim()) return
    onCreate(name)
    setName('')
    setAdding(false)
  }

  return (
    <div class="exercises">
      <div class="chips" role="group" aria-label="Exercises">
        {exercises.map((ex) => (
          <button
            key={ex.id}
            type="button"
            class="chip chip--exercise"
            aria-pressed={ex.id === selectedId}
            title={ex.name}
            onClick={() => onSelect(ex.id)}
          >
            {ex.name}
          </button>
        ))}
        <button
          type="button"
          class="chip"
          aria-expanded={adding}
          onClick={() => setAdding((v) => !v)}
        >
          + New
        </button>
      </div>
      {adding && (
        <form class="custom" onSubmit={submit}>
          <label class="custom__label" for="exercise-name">
            Exercise name
          </label>
          <input
            ref={inputRef}
            id="exercise-name"
            class="custom__input custom__input--name"
            type="text"
            autoComplete="off"
            enterKeyHint="done"
            maxLength={40}
            value={name}
            onInput={(e) => setName(e.currentTarget.value)}
          />
          <button type="submit" class="btn btn--tonal" disabled={!name.trim()}>
            Add
          </button>
        </form>
      )}
    </div>
  )
}
