// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { dayLabel, formatMs, presetLabel, setsLabel } from './format.ts'
import { parseCustom } from './PresetChips.tsx'

it('formats mm:ss with ceiling to whole seconds', () => {
  expect(formatMs(10_000)).toBe('00:10')
  expect(formatMs(9_001)).toBe('00:10')
  expect(formatMs(9_000)).toBe('00:09')
  expect(formatMs(1)).toBe('00:01')
  expect(formatMs(0)).toBe('00:00')
  expect(formatMs(90_000)).toBe('01:30')
  expect(formatMs(100 * 60_000)).toBe('100:00')
})

it('labels presets', () => {
  expect([30_000, 60_000, 90_000, 120_000].map(presetLabel)).toEqual([
    '30s',
    '60s',
    '90s',
    '2m',
  ])
  expect(presetLabel(105_000)).toBe('1:45')
})

it('parses custom m:ss or seconds', () => {
  expect(parseCustom('1:45')).toBe(105_000)
  expect(parseCustom(' 2:05 ')).toBe(125_000)
  expect(parseCustom('75')).toBe(75_000)
  expect(parseCustom('1.45')).toBe(105_000)
  expect(parseCustom('0:00')).toBeNull()
  expect(parseCustom('1:75')).toBeNull()
  expect(parseCustom('abc')).toBeNull()
  expect(parseCustom('')).toBeNull()
})

describe('dayLabel', () => {
  it('says Yesterday for the previous day, across month and year ends', () => {
    expect(dayLabel('2026-11-04', '2026-11-05')).toBe('Yesterday')
    expect(dayLabel('2026-10-31', '2026-11-01')).toBe('Yesterday')
    expect(dayLabel('2025-12-31', '2026-01-01')).toBe('Yesterday')
  })

  it('shows weekday and date, with the year only for another year', () => {
    // Punctuation varies between ICU versions, so match the parts.
    const same = dayLabel('2026-11-03', '2026-11-05', 'en-GB')
    expect(same).toMatch(/^Tue,? 3 Nov$/)
    const other = dayLabel('2025-11-03', '2026-11-05', 'en-GB')
    expect(other).toMatch(/^Mon,? 3 Nov,? 2025$/)
  })
})

describe('setsLabel', () => {
  it('pluralises', () => {
    expect(setsLabel(1)).toBe('1 set')
    expect(setsLabel(0)).toBe('0 sets')
    expect(setsLabel(12)).toBe('12 sets')
  })
})
