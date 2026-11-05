import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, expect, test } from 'vitest'
import { App } from './app.tsx'

afterEach(cleanup)

test('renders the placeholder heading', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'Gym Timer' })).toBeTruthy()
})
