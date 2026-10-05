import { describe, expect, it } from 'vitest'
import { formatDayAndTime, localTimestamp } from './timestamp'

describe('localTimestamp', () => {
  it('writes local wall-clock time without a zone', () => {
    expect(localTimestamp(new Date(2026, 9, 5, 9, 7, 3))).toBe('2026-10-05T09:07:03')
  })
})

describe('formatDayAndTime', () => {
  const now = new Date(2026, 9, 5, 18, 0)
  it('names today and yesterday, otherwise gives the date', () => {
    expect(formatDayAndTime('2026-10-05T14:32:00', now)).toEqual({ day: 'Today', time: '14:32' })
    expect(formatDayAndTime('2026-10-04T16:48:00', now)).toEqual({ day: 'Yesterday', time: '16:48' })
    expect(formatDayAndTime('2026-10-02T09:05:00', now)).toEqual({ day: '2 Oct', time: '09:05' })
  })
})
