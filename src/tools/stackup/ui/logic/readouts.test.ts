import { describe, expect, it } from 'vitest'
import { expectOk } from '../../../../core/testing'
import { analyseStack } from '../../calc'
import { NEW_STACK_INPUTS, emptyDatum, newDimension, newGeometric, type DatumCell, type GeometricEntry, type StackInputs } from '../state/stackInputs'
import { engineInput } from './engineInput'
import {
  bonusReadout, breakdownTerms, datumShiftOf, meanReadout, modifierHeadline, rowResult, shiftReadout, unequalReadout, widened,
} from './readouts'

const hole = { type: 'internal' as const, min: 10, max: 10.2 }
const datumB: DatumCell = { ...emptyDatum('B'), modifier: 'mmb', feature: { type: 'internal', min: 12, max: 12.05 } }
/** Ø0.1 Ⓜ to A and B at MMB: the click-through's position row. */
const position: GeometricEntry = {
  ...newGeometric('position', 0.1), diameterZone: true, materialCondition: 'mmc', feature: hole, datums: [emptyDatum('A'), datumB, emptyDatum()],
}
const withPosition: StackInputs = {
  ...NEW_STACK_INPUTS, standard: 'asme',
  rows: [{ ...newDimension('r1', { kind: 'symmetric', plusMinus: null }), label: 'Edge', nominal: 40 }, { ...newDimension('r2', position), nominal: 25 }],
}

describe('rowResult', () => {
  it('works a row out on its own, while another row is incomplete', () => {
    expect(rowResult(withPosition, new Map(), 0)).toBeNull()
    const row = rowResult(withPosition, new Map(), 1)
    // Zone 0.1 + bonus 0.2, as ± half of it. The datum B shift (0.05) is no longer added to the row: the engine
    // counts it as its own row, once per datum reference frame (mechanical review, UNSURE 5); it is only recorded.
    expect(row?.halfBand).toBeCloseTo(0.15, 12)
    expect(row?.geometric).toMatchObject({ bonus: expect.closeTo(0.2, 12), datumShift: 0, frameDatumShift: expect.closeTo(0.05, 12) })
  })
})

describe('the geometric readouts', () => {
  const breakdown = expectOk(analyseStack(engineInput({ ...withPosition, rows: [withPosition.rows[1]] }, new Map()))).contributors[0].geometric
  if (!breakdown) throw new Error('a position row has a breakdown')

  it('names each term of the band', () => {
    expect(breakdownTerms('si', position, breakdown)).toBe('zone 0.100 + bonus 0.200')
    expect(breakdownTerms('si', position, { ...breakdown, datumShift: 0.05 })).toBe('zone 0.100 + bonus 0.200 + datum B shift 0.050')
    expect(widened(breakdown)).toBe(true)
    expect(widened(null)).toBe(false)
  })

  it('words the bonus by the standard', () => {
    expect(bonusReadout('si', position, 'asme')).toBe('MMC Ø10.000 → bonus up to 0.200')
    expect(bonusReadout('si', position, 'iso')).toBe('MMS Ø10.000 → bonus up to 0.200')
    expect(bonusReadout('si', { ...position, feature: { ...hole, type: 'external' } }, 'asme')).toBe('MMC Ø10.200 → bonus up to 0.200')
    expect(bonusReadout('si', { ...position, materialCondition: 'rfs' }, 'asme')).toBeNull()
  })

  it('moves the datum boundary out by its own tolerance at MMC', () => {
    expect(datumShiftOf(datumB)).toBeCloseTo(0.05, 12)
    expect(shiftReadout('si', datumB)).toBe('MMB Ø12.000 → shift up to 0.050')
    expect(shiftReadout('si', { ...datumB, boundaryAllowance: 0.02 })).toBe('MMB Ø11.980 → shift up to 0.070')
    expect(datumShiftOf(emptyDatum('A'))).toBeNull()
  })

  it('works out an unequally disposed profile zone', () => {
    const profile = { ...newGeometric('profile-surface', 0.3), unequal: { on: true, value: 0.1, typedAs: 'asme-value' as const, materialSide: 'larger' as const } }
    expect(unequalReadout('si', profile)).toMatch(/^profile 0\.300: [+−]0\.\d{3} \/ [+−]0\.\d{3} → mean [+−]0\.050, ±0\.150$/)
    expect(unequalReadout('si', { ...profile, zone: null })).toBeNull()
    // The same zone typed as an ISO UZ offset −0.05: the same readout.
    expect(unequalReadout('si', { ...profile, unequal: { ...profile.unequal, value: -0.05, typedAs: 'iso-offset' } })).toBe(unequalReadout('si', profile))
  })

  it('writes a row centred', () => {
    expect(meanReadout('si', { mean: 0.96, halfBand: 0.035 })).toBe('mean 0.960 · ±0.035')
  })
})

describe('modifierHeadline', () => {
  it('keeps the first sentence and drops its closing citation, nested parentheses and all', () => {
    expect(modifierHeadline('Ⓜ MMC: the zone grows; the largest bonus is added to the zone (ASME Y14.5-2018 §10; Drake, Handbook (McGraw-Hill 1999), ch. 9).'))
      .toBe('Ⓜ MMC: the zone grows; the largest bonus is added to the zone')
    expect(modifierHeadline('Ⓕ free state: recorded; a rigid 1D stack is unchanged. The tolerance applies with the part unrestrained (ASME Y14.5-2018).'))
      .toBe('Ⓕ free state: recorded; a rigid 1D stack is unchanged')
    expect(modifierHeadline('Datum B at Ⓜ (MMR): the part may shift (ISO 2692:2021).')).toBe('Datum B at Ⓜ (MMR): the part may shift')
  })

  it('leaves a line without a citation as it is, but for its full stop', () => {
    expect(modifierHeadline('CZ combined zone: recorded.')).toBe('CZ combined zone: recorded')
  })

  it('shortens every line the engine writes', () => {
    const all: GeometricEntry = { ...position, freeState: true, tangentPlane: true, commonZone: true }
    const analysis = expectOk(analyseStack(engineInput({ ...NEW_STACK_INPUTS, rows: [{ ...newDimension('r1', all), nominal: 25, statistical: true }] }, new Map())))
    const lines = analysis.contributors[0].conversion.modifiers
    expect(lines.length).toBeGreaterThanOrEqual(5)
    for (const line of lines) {
      const headline = modifierHeadline(line)
      expect(headline.length).toBeLessThan(line.length)
      expect(headline).not.toMatch(/[()]$/)
      expect(headline).not.toMatch(/ASME|ISO \d|Drake/)
    }
  })
})
