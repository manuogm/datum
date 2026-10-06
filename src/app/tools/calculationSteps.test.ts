import { describe, expect, it } from 'vitest'
import { recall, remember } from '../ui/sessionMemory'
import { calculationMemoryKey, forgetCalculations, isNewCalculation, openingStep } from './calculationSteps'

const at = '2026-10-01T10:00'
const later = '2026-10-02T09:00'

describe('openingStep', () => {
  it('opens a calculation never saved since it was created on its first step', () => {
    expect(isNewCalculation({ inputs: {}, createdAt: at, updatedAt: at })).toBe(true)
    expect(openingStep({ inputs: {}, createdAt: at, updatedAt: at }, 4)).toEqual({ current: 0, reached: 0 })
  })

  it('opens a saved calculation on Results, every step reached', () => {
    expect(openingStep({ inputs: {}, createdAt: at, updatedAt: later }, 4)).toEqual({ current: 3, reached: 3 })
  })

  it('opens a worked example (inputs null) on Results', () => {
    expect(isNewCalculation({ inputs: null, createdAt: at, updatedAt: at })).toBe(false)
    expect(openingStep({ inputs: null, createdAt: at, updatedAt: at }, 3)).toEqual({ current: 2, reached: 2 })
  })
})

describe('forgetCalculations', () => {
  it("forgets every key of the calculations' screens and nothing of another one", () => {
    const key = (id: string, what: string) => `${calculationMemoryKey(id)}/${what}`
    remember(key('ab', 'steps'), 1)
    remember(key('ab', 'results/details'), true)
    remember(key('abc', 'steps'), 2)
    forgetCalculations(['ab'])
    expect(recall(key('ab', 'steps'), null)).toBeNull()
    expect(recall(key('ab', 'results/details'), null)).toBeNull()
    expect(recall(key('abc', 'steps'), null)).toBe(2)
  })
})
