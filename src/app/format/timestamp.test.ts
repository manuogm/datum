import { describe, expect, it } from 'vitest'
import { localTimestamp } from './timestamp'

describe('localTimestamp', () => {
  it('writes local wall-clock time without a zone', () => {
    expect(localTimestamp(new Date(2026, 9, 5, 9, 7, 3))).toBe('2026-10-05T09:07:03')
  })
})
