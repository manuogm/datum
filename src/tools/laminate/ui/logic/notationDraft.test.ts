import { describe, expect, it } from 'vitest'
import { leaveNotation, liveNotationDraft, notationError, typeNotation } from './notationDraft'

const QUASI = [0, 45, -45, 90, 90, -45, 45, 0]

describe('typing the stacking notation', () => {
  it('replaces the ply angles once the notation parses, and keeps the text as typed', () => {
    const typed = typeNotation('[0/90]s', QUASI)
    expect(typed.anglesDeg).toEqual([0, 90, 90, 0])
    expect(notationError(typed.draft)).toBeNull()
    expect(liveNotationDraft(typed.draft, [0, 90, 90, 0])?.text).toBe('[0/90]s')
  })

  it('keeps an incomplete notation with the reader error, the plies unchanged', () => {
    const typed = typeNotation('[0/45/x', QUASI)
    expect(typed.anglesDeg).toBeNull()
    expect(notationError(typed.draft)).toMatch(/Expected a ply angle at character 7/)
    expect(liveNotationDraft(typed.draft, QUASI)?.text).toBe('[0/45/x')
  })

  it('drops the typed text once the plies change some other way (Reset, ply editor, optimiser)', () => {
    const typed = typeNotation('[0/45/x', QUASI)
    expect(liveNotationDraft(typed.draft, [0, 90, 90, 0])).toBeNull()
    expect(liveNotationDraft(null, QUASI)).toBeNull()
  })

  it('on leaving the field, tidies a notation that parses and keeps one that does not', () => {
    expect(leaveNotation(typeNotation('[0/90]s', QUASI).draft)).toBeNull()
    const broken = typeNotation('[0/45/x', QUASI).draft
    expect(leaveNotation(broken)).toBe(broken)
    expect(leaveNotation(null)).toBeNull()
  })
})
