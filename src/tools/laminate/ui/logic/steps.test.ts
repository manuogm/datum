import { describe, expect, it } from 'vitest'
import { fail } from '../../../../core/result'
import { DEFAULT_LAMINATE_INPUTS, NO_LOADS, pliesAt } from '../state/lamInputs'
import { analyse } from './lamResults'
import { appliedMoments, criterionChanged, initialStep, lamSteps, mixedPlies, stepFault } from './steps'

describe('stepFault', () => {
  it('is null when the analysis runs', () => {
    expect(stepFault(DEFAULT_LAMINATE_INPUTS, analyse(DEFAULT_LAMINATE_INPUTS))).toBeNull()
  })

  it('points at the layup when a ply has no ply data', () => {
    const inputs = { ...DEFAULT_LAMINATE_INPUTS, plies: pliesAt([0, 90], 'steel-s355') }
    expect(stepFault(inputs, analyse(inputs))).toEqual({ step: 'layup', error: expect.stringMatching(/ply material/) })
  })

  it('points at the loads or the check when theirs are the inputs at fault', () => {
    const error = fail('rejected')
    expect(stepFault({ ...DEFAULT_LAMINATE_INPUTS, loads: { ...NO_LOADS, nxNPerMm: Number.NaN } }, error)?.step).toBe('loads')
    expect(stepFault({ ...DEFAULT_LAMINATE_INPUTS, targetReserveFactor: 0 }, error)?.step).toBe('check')
  })
})

describe('lamSteps', () => {
  it('lists Layup · Loads · Check · Results and marks the faulty step', () => {
    expect(lamSteps(null).map((s) => s.label)).toEqual(['Layup', 'Loads', 'Check', 'Results'])
    expect(lamSteps({ step: 'layup', error: 'No ply data' })[0]).toMatchObject({ id: 'layup', invalid: 'No ply data' })
  })
})

describe('initialStep', () => {
  const at = '2026-01-01T00:00:00Z'
  it('opens a new calculation on its first step and any other on its results', () => {
    expect(initialStep({ inputs: {}, createdAt: at, updatedAt: at }, 4)).toEqual({ current: 0, reached: 0 })
    expect(initialStep({ inputs: {}, createdAt: at, updatedAt: '2026-02-01T00:00:00Z' }, 4)).toEqual({ current: 3, reached: 3 })
  })
})

describe('More options counts', () => {
  it('counts plies of another material than the top ply', () => {
    expect(mixedPlies(pliesAt([0, 90, 0]))).toBe(0)
    expect(mixedPlies([...pliesAt([0, 90]), ...pliesAt([0], 'gfrp-e-glass-epoxy-ud')])).toBe(1)
  })

  it('counts the moments applied', () => {
    expect(appliedMoments(DEFAULT_LAMINATE_INPUTS.loads)).toBe(0)
    expect(appliedMoments({ ...NO_LOADS, mxN: 10, mxyN: -2 })).toBe(2)
  })

  it('notes a criterion other than the default', () => {
    expect(criterionChanged({ criterion: 'tsai-wu' })).toBe(0)
    expect(criterionChanged({ criterion: 'max-stress' })).toBe(1)
  })
})
