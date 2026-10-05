import { describe, expect, it } from 'vitest'
import { formatActivityTime } from './formatActivityTime'

const now = new Date(2026, 9, 5, 16, 0)

describe('formatActivityTime', () => {
  it('shows the time for today', () => {
    expect(formatActivityTime(new Date(2026, 9, 5, 14, 32), now)).toBe('14:32 today')
  })

  it('says yesterday for the previous calendar day', () => {
    expect(formatActivityTime(new Date(2026, 9, 4, 23, 59), now)).toBe('yesterday')
  })

  it('shows day and month for older dates this year', () => {
    expect(formatActivityTime(new Date(2026, 9, 2, 9, 0), now)).toBe('2 Oct')
    expect(formatActivityTime(new Date(2026, 8, 29, 9, 0), now)).toBe('29 Sep')
  })

  it('adds the year for earlier years', () => {
    expect(formatActivityTime(new Date(2025, 9, 2, 9, 0), now)).toBe('2 Oct 2025')
  })
})
