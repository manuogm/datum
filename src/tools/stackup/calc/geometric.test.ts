import { describe, expect, it } from 'vitest'
import {
  GEOMETRIC_CHARACTERISTICS, acceptsDiameterZone, acceptsMaterialCondition, centredContributor, geometricDeviations, geometricRule,
  type DimensionContributor, type GeometricTolerance,
} from '.'

/** One geometric row about a basic dimension, sensitivity +1. */
const row = (tolerance: Omit<GeometricTolerance, 'kind'>, nominal = 0) => centredContributor({
  kind: 'dimension', label: 'feature', sensitivity: 1, nominal, tolerance: { kind: 'geometric', ...tolerance },
} satisfies DimensionContributor, 0)

describe('RFS: every characteristic contributes ±t/2 about the basic dimension', () => {
  it.each(GEOMETRIC_CHARACTERISTICS)('%s 0.1 → ±0.05', (characteristic) => {
    const result = row({ characteristic, zone: 0.1 }, 10)
    expect(result.mean).toBeCloseTo(10, 12)
    expect(result.halfBand).toBeCloseTo(0.05, 12)
    expect(result.min).toBeCloseTo(9.95, 12)
    expect(result.max).toBeCloseTo(10.05, 12)
    expect(result.sigma).toBeCloseTo(0.05 / 3, 12)
    expect(result.geometric).toEqual({ zone: 0.1, bonus: 0, datumShift: 0, effectiveZone: 0.1 })
    expect(result.conversion.source).toMatch(/ISO 1101:2017/)
  })

  it('⌀t and a zone t wide give the same band', () => {
    expect(row({ characteristic: 'position', zone: 0.1, diameterZone: true }).halfBand).toBeCloseTo(0.05, 12)
  })
})

describe('Ⓜ / Ⓛ bonus tolerance (largest bonus = size tolerance)', () => {
  it('position ⌀0.1 Ⓜ on a hole ⌀10.0 … 10.2: at LMC the zone is 0.1 + 0.2 = 0.3, so ±0.15', () => {
    // bonus = LMC − MMC = 10.2 − 10.0 = 0.2; effective zone 0.1 + 0.2 = 0.3; ±0.3/2.
    const result = row({ characteristic: 'position', zone: 0.1, diameterZone: true, materialCondition: 'mmc',
      featureSize: { min: 10, max: 10.2 }, featureType: 'internal' }, 30)
    expect(result.geometric?.bonus).toBeCloseTo(0.2, 12)
    expect(result.geometric?.effectiveZone).toBeCloseTo(0.3, 12)
    expect(result.halfBand).toBeCloseTo(0.15, 12)
    expect(result.mean).toBeCloseTo(30, 12)
    expect(result.conversion.modifiers.join(' ')).toMatch(/Ⓜ MMR/)
    expect(result.conversion.unsure).toMatch(/bonus/)
  })

  it('position ⌀0.05 Ⓛ on a pin ⌀9.8 … 10.0: bonus 0.2 at MMC, so ±0.125', () => {
    // Ⓛ: the zone grows as the pin departs from LMC (9.8) towards MMC (10.0): bonus 0.2; (0.05 + 0.2)/2 = 0.125.
    const result = row({ characteristic: 'position', zone: 0.05, materialCondition: 'lmc', featureSize: { min: 9.8, max: 10 }, featureType: 'external' })
    expect(result.geometric?.bonus).toBeCloseTo(0.2, 12)
    expect(result.halfBand).toBeCloseTo(0.125, 12)
    expect(result.conversion.modifiers.join(' ')).toMatch(/Ⓛ LMR/)
  })

  it('perpendicularity ⌀0 Ⓜ: all of the tolerance comes from the bonus', () => {
    expect(row({ characteristic: 'perpendicularity', zone: 0, materialCondition: 'mmc', featureSize: { min: 8, max: 8.03 } }).halfBand).toBeCloseTo(0.015, 12)
  })

  it('which characteristics accept Ⓜ/Ⓛ and ⌀', () => {
    expect(acceptsMaterialCondition('position', 'asme')).toBe(true)
    expect(acceptsMaterialCondition('coaxiality', 'iso')).toBe(true)
    expect(acceptsMaterialCondition('coaxiality', 'asme')).toBe(false)
    expect(acceptsMaterialCondition('profile-surface')).toBe(false)
    expect(acceptsMaterialCondition('total-runout')).toBe(false)
    expect(acceptsDiameterZone('position')).toBe(true)
    expect(acceptsDiameterZone('flatness')).toBe(false)
  })
})

describe('MMB / LMB datum shift', () => {
  it('position ⌀0.1 to A|B(MMB), datum hole B ⌀12.00 … 12.05: shift 0.05, so ±(0.1 + 0.05)/2 = ±0.075', () => {
    const result = row({ characteristic: 'position', zone: 0.1,
      datums: [{ letter: 'A', modifier: 'rmb' }, { letter: 'B', modifier: 'mmb', size: { min: 12, max: 12.05 }, featureType: 'internal' }] })
    expect(result.geometric?.datumShift).toBeCloseTo(0.05, 12)
    expect(result.halfBand).toBeCloseTo(0.075, 12)
    expect(result.conversion.unsure).toMatch(/datum shift/)
  })

  it('a datum feature with its own perpendicularity ⌀0.02 Ⓜ has its MMB at virtual condition: shift 0.05 + 0.02', () => {
    const result = row({ characteristic: 'position', zone: 0.1,
      datums: [{ letter: 'B', modifier: 'mmb', size: { min: 12, max: 12.05 }, boundaryAllowance: 0.02 }] })
    expect(result.halfBand).toBeCloseTo((0.1 + 0.07) / 2, 12)
  })

  it('Ⓜ bonus and MMB shift add: ⌀0.1 Ⓜ (size tol 0.2) to B(MMB) (size tol 0.05) → ±0.175', () => {
    const result = row({ characteristic: 'position', zone: 0.1, materialCondition: 'mmc', featureSize: { min: 10, max: 10.2 },
      datums: [{ letter: 'B', modifier: 'mmb', size: { min: 12, max: 12.05 } }] })
    expect(result.geometric?.effectiveZone).toBeCloseTo(0.35, 12)
    expect(result.halfBand).toBeCloseTo(0.175, 12)
  })

  it('a datum at RMB adds nothing', () => {
    expect(row({ characteristic: 'position', zone: 0.1, datums: [{ letter: 'A', modifier: 'rmb' }] }).halfBand).toBeCloseTo(0.05, 12)
  })
})

describe('Ⓤ / UZ unequally disposed profile shifts the mean', () => {
  it('profile 0.3 Ⓤ 0.1, adding material makes the dimension larger: +0.1/−0.2 → mean −0.05, ±0.15', () => {
    // 0.1 of the zone on the material side (+), 0.3 − 0.1 = 0.2 on the other (−);
    // mean shift (0.1 − 0.2)/2 = −0.05, half band 0.3/2 = 0.15.
    const result = row({ characteristic: 'profile-surface', zone: 0.3, unequal: { value: 0.1, materialSide: 'larger' } }, 25)
    expect(result.max).toBeCloseTo(25.1, 12)
    expect(result.min).toBeCloseTo(24.8, 12)
    expect(result.meanShift).toBeCloseTo(-0.05, 12)
    expect(result.halfBand).toBeCloseTo(0.15, 12)
    expect(result.conversion.modifiers.join(' ')).toMatch(/UZ unequally disposed/)
  })

  it('the same frame on a surface where adding material makes the dimension smaller: +0.2/−0.1 → mean +0.05', () => {
    const result = row({ characteristic: 'profile-surface', zone: 0.3, unequal: { value: 0.1, materialSide: 'smaller' } }, 25)
    expect(result.meanShift).toBeCloseTo(0.05, 12)
    expect(result.halfBand).toBeCloseTo(0.15, 12)
  })

  it('all outside (Ⓤ = t): the zone lies entirely on the material side', () => {
    const result = row({ characteristic: 'profile-line', zone: 0.2, unequal: { value: 0.2, materialSide: 'larger' } })
    expect(result.min).toBeCloseTo(0, 12)
    expect(result.max).toBeCloseTo(0.2, 12)
  })

  it('a profile with a datum at MMB widens equally either side of the Ⓤ band', () => {
    const { upper, lower } = geometricDeviations({ kind: 'geometric', characteristic: 'profile-surface', zone: 0.3,
      unequal: { value: 0.1, materialSide: 'larger' }, datums: [{ letter: 'B', modifier: 'mmb', size: { min: 12, max: 12.04 } }] })
    expect(upper).toBeCloseTo(0.12, 12)
    expect(lower).toBeCloseTo(-0.22, 12)
  })
})

describe('recorded modifiers leave a rigid 1D stack unchanged', () => {
  it('Ⓟ, Ⓕ, Ⓣ and CZ: same ±t/2, one note each', () => {
    const plain = row({ characteristic: 'position', zone: 0.1 })
    const flagged = row({ characteristic: 'position', zone: 0.1, projected: { height: 12 }, freeState: true, tangentPlane: true, commonZone: true })
    expect(flagged.halfBand).toBe(plain.halfBand)
    expect(flagged.mean).toBe(plain.mean)
    expect(flagged.conversion.modifiers).toHaveLength(4)
    expect(flagged.conversion.modifiers.join(' ')).toMatch(/Ⓟ.*Ⓕ.*Ⓣ.*CZ/)
  })
})

describe('inclusion text follows the drawing standard', () => {
  it('form tolerances: Rule #1 for ASME, independency for ISO', () => {
    expect(geometricRule('flatness', 'asme').appliesWhen).toMatch(/Rule #1/)
    expect(geometricRule('flatness', 'iso').appliesWhen).toMatch(/ISO 8015/)
    expect(geometricRule('position', 'asme').appliesWhen).toBe(geometricRule('position', 'iso').appliesWhen)
  })
})
