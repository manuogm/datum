import { describe, expect, it } from 'vitest'
import { DEFAULT_BOLT_INPUTS, type BoltInputs, type JointDesignSpec } from '../state/boltInputs'
import { PATTERN_MISSING_THREAD, PATTERN_WITH_KEENSERT } from '../testFixtures'
import { analyseJoint, boltResults } from './boltResults'
import { boltSteps, jointFault, patternFault, stepLabel } from './steps'

const withDesign = (changes: Partial<JointDesignSpec>): BoltInputs => ({
  ...DEFAULT_BOLT_INPUTS,
  joint: { ...DEFAULT_BOLT_INPUTS.joint, design: { ...DEFAULT_BOLT_INPUTS.joint.design, ...changes } },
})
const faultOf = (inputs: BoltInputs) => jointFault(inputs, analyseJoint(inputs, 'si'), 'si')

describe('jointFault', () => {
  it('finds nothing wrong with an analysable joint', () => {
    expect(faultOf(DEFAULT_BOLT_INPUTS)).toBeNull()
  })

  it('puts a load problem on the Loads step, the service temperature with it', () => {
    const loads = { ...DEFAULT_BOLT_INPUTS.joint.loads, axialMinN: 20_000 }
    expect(faultOf({ ...DEFAULT_BOLT_INPUTS, joint: { ...DEFAULT_BOLT_INPUTS.joint, loads } })).toEqual({ step: 'loads', error: expect.stringMatching(/FA,min/) })
    expect(faultOf({ ...DEFAULT_BOLT_INPUTS, serviceTempC: { minC: 100, maxC: 20 } })).toMatchObject({ step: 'loads' })
  })

  it('puts a friction problem on the Bolt step', () => {
    expect(faultOf(withDesign({ threadFriction: 0 }))).toEqual({ step: 'bolt', error: expect.stringMatching(/Friction/) })
  })

  it('puts a clamped part or a missing insert thread on the Joint step', () => {
    expect(faultOf(withDesign({ outerDiameterMm: 0 }))).toMatchObject({ step: 'joint' })
    const keensert = { kind: 'insert', insert: 'key-locking', materialId: 'al-7075-t6', engagementMm: 15, outerThread: null } as const
    expect(faultOf(withDesign({ joint: keensert }))).toEqual({ step: 'joint', error: expect.stringMatching(/outer thread/) })
  })
})

describe('patternFault', () => {
  const faultOfPattern = (inputs: BoltInputs) => patternFault(inputs, boltResults(inputs, 'si').loadCases, 'si')

  it('finds nothing wrong with an analysable pattern', () => {
    expect(faultOfPattern(PATTERN_WITH_KEENSERT)).toBeNull()
  })

  it('puts a joint type that cannot be analysed on the Joint types step', () => {
    expect(faultOfPattern(PATTERN_MISSING_THREAD)).toEqual({ step: 'types', error: expect.stringMatching(/^Joint type J4: .*outer thread/) })
  })

  it('puts a load case that cannot be carried on the Load cases step', () => {
    const inLine = { ...PATTERN_WITH_KEENSERT.pattern, bolts: PATTERN_WITH_KEENSERT.pattern.bolts.map((b) => ({ ...b, yMm: 0 })) }
    expect(faultOfPattern({ ...PATTERN_WITH_KEENSERT, pattern: inLine })).toEqual({ step: 'load-cases', error: expect.stringMatching(/^LC2 Bump: The bolts lie in one line/) })
  })
})

describe('boltSteps', () => {
  it('lists each mode\'s steps, ending on Results, and marks the one at fault', () => {
    expect(boltSteps('joint', null).map((s) => s.label)).toEqual(['Bolt', 'Joint', 'Loads', 'Results'])
    expect(boltSteps('pattern', null).map((s) => s.label)).toEqual(['Joint types', 'Bolts', 'Load cases', 'Results'])
    const marked = boltSteps('joint', { step: 'joint', error: 'DA too small' })
    expect(marked.map((s) => s.invalid)).toEqual([undefined, 'DA too small', undefined, undefined])
    expect(stepLabel('pattern', 'load-cases')).toBe('Load cases')
  })
})

