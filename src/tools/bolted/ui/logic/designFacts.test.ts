import { describe, expect, it } from 'vitest'
import { DEFAULT_BOLT_INPUTS } from '../state/boltInputs'
import { PATTERN_MISSING_THREAD } from '../testFixtures'
import { designFacts, jointFacts } from './designFacts'

describe('jointFacts', () => {
  it('lists the default joint in SI', () => {
    const facts = Object.fromEntries(jointFacts(DEFAULT_BOLT_INPUTS, 'si').map((f) => [f.label, f.value]))
    expect(facts).toMatchObject({
      Bolt: 'M10 10.9, hexagon',
      Joint: 'Through-bolt, ISO 4032 nut',
      'Part 2': 'S355JR, 8.000 mm',
      'Friction µG / µK / µT': '0.12 / 0.12 / 0.15',
      'Slip interfaces qF': '1',
      'FA,max / FA,min': '12.00 kN / 0.00 kN',
    })
  })

  it('flags a missing insert outer thread', () => {
    const keensert = { ...DEFAULT_BOLT_INPUTS, joint: { ...DEFAULT_BOLT_INPUTS.joint, design: PATTERN_MISSING_THREAD.pattern.jointTypes[3].design } }
    expect(jointFacts(keensert, 'si').find((f) => f.label === 'Insert outer thread')).toMatchObject({ value: 'not given', warn: true })
  })

  it('shows a pG that was entered', () => {
    const plates = [{ materialId: 'peek', thicknessMm: 5, limitingPressureMPa: 120 }]
    expect(designFacts({ ...DEFAULT_BOLT_INPUTS.joint.design, plates }, 'si').find((f) => f.label === 'Part 1')?.value).toBe('PEEK, 5.000 mm, pG 120 MPa entered')
  })
})

describe('designFacts', () => {
  it('lists the design without the loads, for a pattern\'s joint type', () => {
    const labels = designFacts(DEFAULT_BOLT_INPUTS.joint.design, 'si').map((f) => f.label)
    expect(labels).toContain('Tightening')
    expect(labels).not.toContain('FQ')
    expect(labels).not.toContain('Service temperature')
  })

  it('does not flag a Helicoil without an outer thread, which takes the STI thread', () => {
    const helicoil = { kind: 'insert', insert: 'helical-coil', materialId: 'al-7075-t6', engagementMm: 6, outerThread: null } as const
    expect(designFacts({ ...DEFAULT_BOLT_INPUTS.joint.design, joint: helicoil }, 'si').find((f) => f.label === 'Insert outer thread'))
      .toEqual({ label: 'Insert outer thread', value: 'STI, from the bolt thread', mono: true, warn: false })
  })
})
