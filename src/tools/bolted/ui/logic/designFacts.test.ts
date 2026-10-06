import { describe, expect, it } from 'vitest'
import { DEFAULT_BOLT_INPUTS } from '../state/boltInputs'
import { PATTERN_MISSING_THREAD } from '../testFixtures'
import { jointFacts } from './designFacts'

describe('jointFacts', () => {
  it('lists the default joint in SI', () => {
    const facts = Object.fromEntries(jointFacts(DEFAULT_BOLT_INPUTS, 'si').map((f) => [f.label, f.value]))
    expect(facts).toMatchObject({
      Bolt: 'M10 10.9, hexagon',
      Joint: 'Through-bolt, ISO 4032 nut',
      'Part 2': 'S355JR, 8.000 mm',
      'Friction µG / µK / µT': '0.12 / 0.12 / 0.15',
      'FA,max / FA,min': '12.00 kN / 0.00 kN',
    })
  })

  it('flags a missing insert outer thread', () => {
    const keensert = { ...DEFAULT_BOLT_INPUTS, joint: { ...DEFAULT_BOLT_INPUTS.joint, design: PATTERN_MISSING_THREAD.pattern.jointTypes[3].design } }
    expect(jointFacts(keensert, 'si').find((f) => f.label === 'Insert outer thread')).toMatchObject({ value: 'not given', warn: true })
  })
})
