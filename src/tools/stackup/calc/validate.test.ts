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
    ['datum shift row: datum at MMB without size', { contributors: [{ kind: 'datum-shift', label: 'Shift', sensitivity: 1, datums: [{ letter: 'B', modifier: 'mmb' }] }] }, /Row 1 "Shift" needs the smallest and largest size of datum feature B/],
    ['datum shift row: all at RMB', { contributors: [{ kind: 'datum-shift', label: 'Shift', sensitivity: 1, datums: [{ letter: 'A', modifier: 'rmb' }] }] }, /no datum of the frame is at MMB or LMB/],
    ['datum shift row: no datums', { contributors: [{ kind: 'datum-shift', label: 'Shift', sensitivity: 1, datums: [] }] }, /needs the datums of its frame/],
    ['MMB with reversed datum size', { contributors: [geometric({ datums: [{ letter: 'B', modifier: 'mmb', size: { min: 2, max: 1 } }] })] }, /largest size of datum feature B is below/],
    ['MMB on runout', { contributors: [geometric({ characteristic: 'total-runout', datums: [{ letter: 'B', modifier: 'mmb', size: { min: 1, max: 2 } }] })] }, /always at RMB/],
    ['negative datum allowance', { contributors: [geometric({ datums: [{ letter: 'B', modifier: 'mmb', size: { min: 1, max: 2 }, boundaryAllowance: -1 }] })] }, /datum feature B must be zero or more/],
    ['Ⓤ on position', { contributors: [geometric({ unequal: { value: 0.05, materialSide: 'larger' } })] }, /only a profile/],
    ['ASME Ⓤ value above the zone', { standard: 'asme', contributors: [geometric({ characteristic: 'profile-surface', unequal: { value: 0.2, materialSide: 'larger' } })] }, /Ⓤ value must lie between 0 and the profile tolerance \(ASME Y14.5-2018 §11\)/],
    ['ASME Ⓤ value below 0', { standard: 'asme', contributors: [geometric({ characteristic: 'profile-surface', unequal: { value: -0.01, materialSide: 'larger' } })] }, /between 0 and the profile tolerance/],
    ['ISO UZ offset not a number', { contributors: [geometric({ characteristic: 'profile-surface', unequal: { value: Number.NaN, materialSide: 'larger' } })] }, /needs a UZ offset/],
    ['surface stack at RFS', { contributors: [geometric({ stackTo: 'near-surface', featureType: 'internal' })] }, /needs Ⓜ or Ⓛ; at RFS add half the size/],
    ['surface stack without hole / pin', { contributors: [geometric({ stackTo: 'far-surface', materialCondition: 'mmc', featureSize: { min: 10, max: 10.2 } })] }, /hole or slot \(internal\) or a pin or tab \(external\)/],
    ['surface stack on perpendicularity', { contributors: [geometric({ characteristic: 'perpendicularity', stackTo: 'far-surface', materialCondition: 'mmc', featureSize: { min: 10, max: 10.2 }, featureType: 'external' })] }, /only a position, coaxiality or symmetry tolerance/],
    ['surface stack on coaxiality under ASME', { standard: 'asme', contributors: [geometric({ characteristic: 'coaxiality', stackTo: 'far-surface' })] }, /only a position tolerance with Ⓜ or Ⓛ/],
    ['unknown stack-to', { contributors: [geometric({ stackTo: 'middle' as never })] }, /axis, the near surface or the far surface/],
    ['high points on position', { contributors: [geometric({ highPoints: { materialSide: 'larger' } })] }, /only flatness or straightness/],
    ['high points at Ⓜ', { contributors: [geometric({ characteristic: 'flatness', materialCondition: 'mmc', featureSize: { min: 1, max: 2 }, highPoints: { materialSide: 'larger' } })] }, /derived median plane/],
    ['linked stack with a negative ⟨ST⟩ part', { contributors: [{ kind: 'linked', label: 'Housing', sensitivity: 1, stack: { name: 'H', nominal: 1, mean: 1, upperDeviation: 0.1, lowerDeviation: -0.1, sigma: 0.03, statisticalHalfBand: -0.1 } }] }, /broken worst-case band/],
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
