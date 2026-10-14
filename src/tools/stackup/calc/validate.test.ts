import { describe, expect, it } from 'vitest'
import { expectError } from '../../../core/testing'
import { analyseStack, type Contributor, type GeometricTolerance, type StackInput } from '.'

const row = (change: Partial<Contributor> & Record<string, unknown>): Contributor =>
  ({ kind: 'dimension', label: 'Spacer', sensitivity: -1, nominal: 5, tolerance: { kind: 'symmetric', plusMinus: 0.03 }, ...change }) as Contributor
const geometric = (tolerance: Partial<GeometricTolerance>, label = 'Pin hole'): Contributor =>
  row({ label, tolerance: { kind: 'geometric', characteristic: 'position', zone: 0.1, ...tolerance } as GeometricTolerance })

const valid: StackInput = { name: 'Gap', contributors: [row({ label: 'Housing', sensitivity: 1, nominal: 10 }), row({})] }

describe('invalid input gives an explanation naming the row, never an exception', () => {
  it('accepts the valid base case', () => {
    expect(analyseStack(valid).ok).toBe(true)
  })

  it.each<[string, Partial<StackInput>, RegExp]>([
    ['empty chain', { contributors: [] }, /at least one/],
    ['unknown method', { method: 'monte-carlo' as never }, /method/],
    ['unknown standard', { standard: 'din' as never }, /standard/],
    ['too many rows', { contributors: Array.from({ length: 201 }, () => row({})) }, /at most 200/],
    ['zero sensitivity', { contributors: [row({ sensitivity: 0 })] }, /Row 1 "Spacer" needs a direction/],
    ['NaN nominal', { contributors: [row({}), row({ label: 'Circlip', nominal: Number.NaN })] }, /Row 2 "Circlip" needs a nominal/],
    ['infinite nominal', { contributors: [row({ label: '', nominal: Infinity })] }, /^Row 1 needs a nominal/],
    ['negative ±', { contributors: [row({ tolerance: { kind: 'symmetric', plusMinus: -0.01 } })] }, /Spacer.*cannot be negative/],
    ['upper deviation below lower', { contributors: [row({ tolerance: { kind: 'deviations', upper: -0.1, lower: 0 } })] }, /Spacer.*negative tolerance band/],
    ['limits reversed', { contributors: [row({ tolerance: { kind: 'limits', min: 5.1, max: 5 } })] }, /Spacer.*negative tolerance band/],
    ['non-finite deviation', { contributors: [row({ tolerance: { kind: 'deviations', upper: Number.NaN, lower: 0 } })] }, /upper and a lower/],
    ['no tolerance', { contributors: [row({ tolerance: undefined })] }, /needs a tolerance/],
    ['unknown characteristic', { contributors: [geometric({ characteristic: 'roundness' as never })] }, /Pin hole" needs a geometric characteristic/],
    ['negative zone', { contributors: [geometric({ zone: -0.1 })] }, /Pin hole.*cannot be negative/],
    ['⌀ on flatness', { contributors: [geometric({ characteristic: 'flatness', diameterZone: true })] }, /cannot carry ⌀/],
    ['Ⓜ without feature size', { contributors: [geometric({ materialCondition: 'mmc' })] }, /Pin hole" needs the smallest and largest size of the toleranced feature/],
    ['Ⓜ with reversed size', { contributors: [geometric({ materialCondition: 'mmc', featureSize: { min: 10.2, max: 10 } })] }, /largest size of the toleranced feature is below/],
    ['Ⓜ on runout', { contributors: [geometric({ characteristic: 'circular-runout', materialCondition: 'mmc', featureSize: { min: 1, max: 2 } })] }, /cannot take Ⓜ/],
    ['Ⓜ on coaxiality under ASME', { standard: 'asme', contributors: [geometric({ characteristic: 'coaxiality', materialCondition: 'mmc', featureSize: { min: 1, max: 2 } })] }, /ASME/],
    ['datums on flatness', { contributors: [geometric({ characteristic: 'flatness', datums: [{ letter: 'A', modifier: 'rmb' }] })] }, /takes no datums/],
    ['MMB without datum size', { contributors: [geometric({ datums: [{ letter: 'B', modifier: 'mmb' }] })] }, /size of datum feature B/],
    ['MMB on runout', { contributors: [geometric({ characteristic: 'total-runout', datums: [{ letter: 'B', modifier: 'mmb', size: { min: 1, max: 2 } }] })] }, /always at RMB/],
    ['negative datum allowance', { contributors: [geometric({ datums: [{ letter: 'B', modifier: 'mmb', size: { min: 1, max: 2 }, boundaryAllowance: -1 }] })] }, /datum feature B must be zero or more/],
    ['Ⓤ on position', { contributors: [geometric({ unequal: { value: 0.05, materialSide: 'larger' } })] }, /only a profile/],
    ['Ⓤ share above the zone', { contributors: [geometric({ characteristic: 'profile-surface', unequal: { value: 0.2, materialSide: 'larger' } })] }, /between 0 and the profile tolerance/],
    ['Ⓟ on profile', { contributors: [geometric({ characteristic: 'profile-surface', projected: { height: 10 } })] }, /projected zone Ⓟ/],
    ['Ⓟ height zero', { contributors: [geometric({ projected: { height: 0 } })] }, /height must be above zero/],
    ['linked stack without result', { contributors: [{ kind: 'linked', label: 'Housing', sensitivity: 1, stack: { name: 'H', nominal: Number.NaN, mean: 0, upperDeviation: 0, lowerDeviation: 0, sigma: 0 } }] }, /Row 1 "Housing".*save that part calculation again/],
    ['linked stack with negative σ', { contributors: [{ kind: 'linked', label: 'Housing', sensitivity: 1, stack: { name: 'H', nominal: 1, mean: 1, upperDeviation: 0.1, lowerDeviation: -0.1, sigma: -1 } }] }, /negative σ/],
    ['requirement min above max', { requirement: { min: 1, max: 0.5 } }, /smallest allowed result is above the largest/],
    ['requirement not a number', { requirement: { max: Number.NaN } }, /largest allowed result must be a number/],
  ])('%s', (_name, change, message) => {
    expect(() => analyseStack({ ...valid, ...change })).not.toThrow()
    expect(expectError(analyseStack({ ...valid, ...change }))).toMatch(message)
  })
})
