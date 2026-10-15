import { describe, expect, it } from 'vitest'
import { stackInputsFrom } from '../state/readInputs'
import { stackReducer } from '../state/stackReducer'
import { NEW_STACK_INPUTS, newDimension, newGeometric, type GeometricEntry, type StackInputs } from '../state/stackInputs'
import { engineInput } from './engineInput'
import { rowResult } from './readouts'
import { unequalEngineValue, unequalShown } from './unequal'

/** One profile-of-a-surface row (basic 25, UZ / Ⓤ on, adding material makes it larger) on a drawing of this standard. */
function profileStack(standard: StackInputs['standard']): StackInputs {
  const profile: GeometricEntry = { ...newGeometric('profile-surface'), unequal: { ...newGeometric().unequal, on: true } }
  return { ...NEW_STACK_INPUTS, standard, rows: [{ ...newDimension('r1', profile), nominal: 25 }] }
}

const geometric = (changes: Partial<GeometricEntry>) => ({ type: 'geometric' as const, id: 'r1', changes })
/** What typing in the field stores (GeometricFields): the number, in this standard's form. */
const typeUnequal = (inputs: StackInputs, value: number) =>
  stackReducer(inputs, geometric({ unequal: { ...entryOf(inputs).unequal, value, typedAs: inputs.standard === 'iso' ? 'iso-offset' : 'asme-value' } }))

function entryOf(inputs: StackInputs): GeometricEntry {
  const row = inputs.rows[0]
  if (row.kind !== 'dimension' || row.tolerance.kind !== 'geometric') throw new Error('a geometric row')
  return row.tolerance
}

/** The Ⓤ value the engine is given, and the mean shift it gives the row. */
function engineSees(inputs: StackInputs) {
  const contributor = engineInput(inputs, new Map()).contributors[0]
  const tolerance = contributor.kind === 'dimension' ? contributor.tolerance : null
  const value = tolerance?.kind === 'geometric' ? tolerance.unequal?.value : undefined
  return { value, meanShift: rowResult(inputs, new Map(), 0)?.meanShift }
}

describe('ISO UZ offset (ISO 1101:2017): stored as typed, converted with the zone of the moment', () => {
  it('zone first, then the offset: UZ+0.05 on 0.3 is the Ⓤ value 0.20, a mean shift of +0.05', () => {
    const inputs = typeUnequal(stackReducer(profileStack('iso'), geometric({ zone: 0.3 })), 0.05)
    expect(entryOf(inputs).unequal).toMatchObject({ value: 0.05, typedAs: 'iso-offset' })
    const seen = engineSees(inputs)
    expect(seen.value).toBeCloseTo(0.2, 12)
    expect(seen.meanShift).toBeCloseTo(0.05, 12)
  })

  it('offset first, then the zone: the same result (B1: the offset no longer depends on the order)', () => {
    const offsetFirst = stackReducer(typeUnequal(profileStack('iso'), 0.05), geometric({ zone: 0.3 }))
    expect(entryOf(offsetFirst).unequal.value).toBe(0.05)
    expect(engineSees(offsetFirst).value).toBeCloseTo(0.2, 12)
    expect(engineSees(offsetFirst).meanShift).toBeCloseTo(0.05, 12)
  })

  it('a later change of the zone keeps the offset and its mean shift (0.3 → 0.4: Ⓤ value 0.25)', () => {
    const at03 = typeUnequal(stackReducer(profileStack('iso'), geometric({ zone: 0.3 })), 0.05)
    const at04 = stackReducer(at03, geometric({ zone: 0.4 }))
    expect(unequalShown(entryOf(at04), 'iso')).toBe(0.05)
    expect(engineSees(at04).value).toBeCloseTo(0.25, 12)
    expect(engineSees(at04).meanShift).toBeCloseTo(0.05, 12)
  })
})

describe('ASME Ⓤ value (ASME Y14.5-2018 §11): stored as typed', () => {
  it('keeps the value when the zone changes, in either order', () => {
    const valueFirst = stackReducer(typeUnequal(profileStack('asme'), 0.2), geometric({ zone: 0.3 }))
    const zoneFirst = typeUnequal(stackReducer(profileStack('asme'), geometric({ zone: 0.3 })), 0.2)
    expect(engineSees(valueFirst)).toEqual(engineSees(zoneFirst))
    expect(engineSees(valueFirst).meanShift).toBeCloseTo(0.05, 12)
    const wider = stackReducer(valueFirst, geometric({ zone: 0.4 }))
    expect(engineSees(wider).value).toBe(0.2)
    // Ⓤ 0.2 of 0.4: +0.2 / −0.2, centred again.
    expect(engineSees(wider).meanShift).toBeCloseTo(0, 12)
  })
})

describe('switching the drawing standard', () => {
  it('re-expresses the number in the other form with the zone, and back', () => {
    const iso = typeUnequal(stackReducer(profileStack('iso'), geometric({ zone: 0.3 })), 0.05)
    const asme = stackReducer(iso, { type: 'change', changes: { standard: 'asme' } })
    expect(entryOf(asme).unequal).toMatchObject({ value: 0.2, typedAs: 'asme-value' })
    expect(engineSees(asme).value).toBeCloseTo(0.2, 12)
    const back = stackReducer(asme, { type: 'change', changes: { standard: 'iso' } })
    expect(entryOf(back).unequal).toMatchObject({ value: 0.05, typedAs: 'iso-offset' })
  })

  it('leaves the number as typed while there is no zone to convert it with', () => {
    const iso = typeUnequal(profileStack('iso'), 0.05)
    const asme = stackReducer(iso, { type: 'change', changes: { standard: 'asme' } })
    expect(entryOf(asme).unequal).toMatchObject({ value: 0.05, typedAs: 'iso-offset' })
    expect(engineSees(stackReducer(asme, geometric({ zone: 0.3 }))).value).toBeCloseTo(0.2, 12)
  })
})

describe('a calculation saved before the number was stored as typed', () => {
  it('reads it back as the Ⓤ value it was, and shows it as the ISO offset of its zone', () => {
    const stored = {
      ...NEW_STACK_INPUTS,
      rows: [{
        kind: 'dimension', id: 'r1', label: '', sensitivity: 1, nominal: 25, statistical: false, source: '',
        tolerance: { kind: 'geometric', characteristic: 'profile-surface', zone: 0.3, unequal: { on: true, value: 0.2, materialSide: 'larger' } },
      }],
    }
    const inputs = stackInputsFrom(stored)
    const entry = entryOf(inputs)
    expect(entry.unequal).toMatchObject({ value: 0.2, typedAs: 'asme-value' })
    expect(unequalEngineValue(entry)).toBe(0.2)
    expect(unequalShown(entry, 'iso')).toBeCloseTo(0.05, 12)
    expect(engineSees(inputs).meanShift).toBeCloseTo(0.05, 12)
  })
})
