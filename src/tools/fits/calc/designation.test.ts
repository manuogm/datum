import { describe, expect, it } from 'vitest'
import { formatFit, parseFitDesignation, parseZone } from './designation'
import { expectError, expectOk } from '../../../core/testing'

describe('parseZone', () => {
  it.each([
    ['H7', 'hole', 'h', '7'], ['g6', 'shaft', 'g', '6'], ['JS11', 'hole', 'js', '11'],
    ['zc10', 'shaft', 'zc', '10'], ['h01', 'shaft', 'h', '01'], [' K 8 ', 'hole', 'k', '8'],
  ] as const)('%s', (text, kind, letter, grade) => {
    expect(expectOk(parseZone(text))).toEqual({ kind, letter, grade })
  })

  it.each(['H', '7', 'H19', 'H07', 'Jx7', 'Js7', 'I7', 'H7.5', ''])('rejects "%s"', (text) => {
    expectError(parseZone(text))
  })
})

describe('parseFitDesignation', () => {
  it('reads hole class / shaft class', () => {
    const fit = expectOk(parseFitDesignation('H7/g6'))
    expect(fit.hole).toEqual({ kind: 'hole', letter: 'h', grade: '7' })
    expect(fit.shaft).toEqual({ kind: 'shaft', letter: 'g', grade: '6' })
    expect(formatFit(expectOk(parseFitDesignation(' G7 / h6 ')))).toBe('G7/h6')
  })

  it.each(['g6/H7', 'H7/G6', 'H7', 'H7/g6/h6', 'H7/'])('rejects "%s"', (text) => {
    expectError(parseFitDesignation(text))
  })
})
