import { describe, expect, it } from 'vitest'
import {
  GEOMETRIC_CHARACTERISTICS, acceptsCombinedZone, acceptsDiameterZone, acceptsMaterialCondition, acceptsSurfaceBoundary, acceptsTangentPlane,
  analyseStack, centredContributor, characteristicsOf, datumShiftRowsFor, geometricAvailability, geometricDeviations, geometricRule,
  isoOffsetFromUnequalValue, surfaceBoundary, unequalValueFromIsoOffset,
  type Contributor, type DatumShiftContributor, type DimensionContributor, type GeometricTolerance,
} from '.'
import { expectOk } from '../../../core/testing'

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
    expect(result.geometric).toEqual({ zone: 0.1, bonus: 0, datumShift: 0, effectiveZone: 0.1, frameDatumShift: 0, surface: null })
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

describe('MMB / LMB datum shift is its own row, once per frame', () => {
  const frameAB = [{ letter: 'A', modifier: 'rmb' }, { letter: 'B', modifier: 'mmb', size: { min: 12, max: 12.05 }, featureType: 'internal' }] as const

  it('a geometric row to A|B(MMB) keeps its ±t/2 and records the frame shift 0.05 for the note', () => {
    const result = row({ characteristic: 'position', zone: 0.1, datums: frameAB })
    expect(result.halfBand).toBeCloseTo(0.05, 12)
    expect(result.geometric?.datumShift).toBe(0)
    expect(result.geometric?.frameDatumShift).toBeCloseTo(0.05, 12)
    expect(result.conversion.modifiers.join(' ')).toMatch(/add one datum-shift row/)
  })

  it('MMB recorded on a geometric row without the datum size is accepted', () => {
    expectOk(analyseStack({ name: 'x', contributors: [{ kind: 'dimension', label: 'hole', sensitivity: 1, nominal: 0,
      tolerance: { kind: 'geometric', characteristic: 'position', zone: 0.1, datums: [{ letter: 'B', modifier: 'mmb' }] } }] }))
  })

  const shiftRow = (datums: DatumShiftContributor['datums'], frame?: string): DatumShiftContributor =>
    ({ kind: 'datum-shift', label: 'Shift on B', sensitivity: 1, datums, frame })

  it('datum hole B ⌀12.00 … 12.05 at MMB: shift 0.05, the row is 0 ± 0.025', () => {
    // shift = size tolerance = 12.05 − 12.00 = 0.05 (diametral), so ±0.05/2 along the stack.
    const result = centredContributor(shiftRow(frameAB), 0)
    expect(result.kind).toBe('datum-shift')
    expect(result.nominal).toBe(0)
    expect(result.halfBand).toBeCloseTo(0.025, 12)
    expect(result.sigma).toBeCloseTo(0.025 / 3, 12)
    expect(result.geometric?.datumShift).toBeCloseTo(0.05, 12)
    expect(result.conversion.rule).toMatch(/A\|B\(M\)/)
    expect(result.conversion.unsure).toBeNull()
  })

  it('a datum feature with its own perpendicularity ⌀0.02 Ⓜ has its MMB at virtual condition: shift 0.05 + 0.02', () => {
    const result = centredContributor(shiftRow([{ letter: 'B', modifier: 'mmb', size: { min: 12, max: 12.05 }, boundaryAllowance: 0.02 }]), 0)
    expect(result.halfBand).toBeCloseTo(0.07 / 2, 12)
  })

  it('secondary and tertiary at MMB add, and the tertiary is flagged as really a rotation', () => {
    const result = centredContributor(shiftRow([{ letter: 'A', modifier: 'rmb' }, { letter: 'B', modifier: 'mmb', size: { min: 12, max: 12.05 } },
      { letter: 'C', modifier: 'lmb', size: { min: 6, max: 6.03 } }]), 0)
    expect(result.halfBand).toBeCloseTo((0.05 + 0.03) / 2, 12)
    expect(result.conversion.unsure).toMatch(/tertiary datum C.*rotation/)
  })

  it('warnings: a shift counted twice, a tertiary shift, a frame with MMB and no shift row', () => {
    const position = (label: string): Contributor => ({ kind: 'dimension', label, sensitivity: 1, nominal: 10,
      tolerance: { kind: 'geometric', characteristic: 'position', zone: 0.1, datums: [{ letter: 'A', modifier: 'rmb' }, { letter: 'C', modifier: 'mmb' }] } })
    const analysis = expectOk(analyseStack({ name: 'x', contributors: [
      shiftRow(frameAB), { ...shiftRow(frameAB), label: 'Again' }, position('Hole 1'), position('Hole 2'),
      shiftRow([{ letter: 'A', modifier: 'rmb' }, { letter: 'B', modifier: 'rmb' }, { letter: 'C', modifier: 'mmb', size: { min: 6, max: 6.03 } }]),
    ] }))
    expect(analysis.warnings.filter((text) => /already in Row 1/.test(text))).toEqual([expect.stringMatching(/^Row 2 "Again"/)])
    expect(analysis.warnings.filter((text) => /tertiary datum C/.test(text))).toHaveLength(1)
    // Frame A|C(M) of the two holes has no shift row: one warning for the frame, not one per row.
    expect(analysis.warnings.filter((text) => /frame A\|C\(M\) has datums at MMB/.test(text))).toEqual([expect.stringMatching(/^Row 3 "Hole 1"/)])
  })

  it('the same letters in two named frames (two parts) are two frames', () => {
    const analysis = expectOk(analyseStack({ name: 'x', contributors: [shiftRow(frameAB, 'Cover'), shiftRow(frameAB, 'Housing')] }))
    expect(analysis.warnings).toEqual([])
    expect(analysis.worstCase.halfBand).toBeCloseTo(0.05, 12)
  })

  it('migrating an old input: one datum-shift row per frame that has a shift and no row yet', () => {
    const hole = (label: string, datums: GeometricTolerance['datums']): Contributor =>
      ({ kind: 'dimension', label, sensitivity: 1, nominal: 0, tolerance: { kind: 'geometric', characteristic: 'position', zone: 0.1, datums } })
    const rows = datumShiftRowsFor([hole('1', frameAB), hole('2', frameAB), hole('3', [{ letter: 'D', modifier: 'mmb' }]), hole('4', [{ letter: 'A', modifier: 'rmb' }])])
    expect(rows).toEqual([{ kind: 'datum-shift', label: 'Datum shift A|B(M)', sensitivity: 1, datums: frameAB }])
    expect(datumShiftRowsFor([hole('1', frameAB), shiftRow(frameAB)])).toEqual([])
  })

  it('a datum at RMB adds nothing', () => {
    expect(row({ characteristic: 'position', zone: 0.1, datums: [{ letter: 'A', modifier: 'rmb' }] }).halfBand).toBeCloseTo(0.05, 12)
  })
})

describe('Ⓜ/Ⓛ stacked to the feature surface: virtual / resultant condition boundaries', () => {
  const plateHole = (stackTo: GeometricTolerance['stackTo']): GeometricTolerance => ({ kind: 'geometric', characteristic: 'position', zone: 0.1,
    diameterZone: true, materialCondition: 'mmc', featureSize: { min: 10, max: 10.2 }, featureType: 'internal', stackTo })

  it("the review's plate: wall from edge B to hole ⌀10.0 … 10.2 at basic 20, position ⌀0.1 Ⓜ → 14.75 … 15.05", () => {
    // Ⓜ hole: VC = MMC − t = 10.0 − 0.1 = 9.9; RC = LMC + t + T = 10.2 + 0.1 + 0.2 = 10.5.
    // The surface lies 9.9/2 = 4.95 … 10.5/2 = 5.25 from the true position at 20,
    // so the near wall is 20 − 5.25 = 14.75 … 20 − 4.95 = 15.05: mean 14.90 ± 0.15.
    // Nominal 20 − (10.0 + 10.2)/4 = 14.95 (half the mean size).
    const result = centredContributor({ kind: 'dimension', label: 'Wall', sensitivity: 1, nominal: 20, tolerance: plateHole('near-surface') }, 0)
    expect(result.min).toBeCloseTo(14.75, 12)
    expect(result.max).toBeCloseTo(15.05, 12)
    expect(result.nominal).toBeCloseTo(14.95, 12)
    expect(result.mean).toBeCloseTo(14.9, 12)
    expect(result.halfBand).toBeCloseTo(0.15, 12)
    expect(result.geometric?.surface).toEqual({ side: -1, virtualCondition: 9.9, resultantCondition: expect.closeTo(10.5, 12),
      innerRadius: 4.95, outerRadius: expect.closeTo(5.25, 12), nominalRadius: expect.closeTo(5.05, 12) })
    expect(result.conversion.appliesWhen).toMatch(/do not add a separate radius/)
    // Requirement 14.70 … 15.10: passes by worst case (the axis row + radius row gave 14.75 … 15.15 and failed).
    const analysis = expectOk(analyseStack({ name: 'Wall', requirement: { min: 14.7, max: 15.1 },
      contributors: [{ kind: 'dimension', label: 'Wall', sensitivity: 1, nominal: 20, tolerance: plateHole('near-surface') }] }))
    expect(analysis.verdict?.status).toBe('pass')
  })

  it('the far surface of the same hole: 20 + 4.95 … 20 + 5.25', () => {
    const result = centredContributor({ kind: 'dimension', label: 'Far wall', sensitivity: 1, nominal: 20, tolerance: plateHole('far-surface') }, 0)
    expect(result.min).toBeCloseTo(24.95, 12)
    expect(result.max).toBeCloseTo(25.25, 12)
  })

  it.each<[string, Pick<GeometricTolerance, 'materialCondition' | 'featureType'>, number, number]>([
    // Size 9.8 … 10.0, t = 0.1, T = 0.2.
    // Ⓜ pin: VC = MMC + t = 10.0 + 0.1 = 10.1 (outer); RC = LMC − t − T = 9.8 − 0.3 = 9.5 (inner).
    ['Ⓜ pin', { materialCondition: 'mmc', featureType: 'external' }, 10.1, 9.5],
    // Ⓛ pin: VC = LMC − t = 9.8 − 0.1 = 9.7 (inner); RC = MMC + t + T = 10.0 + 0.3 = 10.3 (outer).
    ['Ⓛ pin', { materialCondition: 'lmc', featureType: 'external' }, 9.7, 10.3],
    // Ⓛ hole: VC = LMC + t = 10.0 + 0.1 = 10.1 (outer); RC = MMC − t − T = 9.8 − 0.3 = 9.5 (inner).
    ['Ⓛ hole', { materialCondition: 'lmc', featureType: 'internal' }, 10.1, 9.5],
    // Ⓜ hole: VC = MMC − t = 9.8 − 0.1 = 9.7 (inner); RC = LMC + t + T = 10.0 + 0.3 = 10.3 (outer).
    ['Ⓜ hole', { materialCondition: 'mmc', featureType: 'internal' }, 9.7, 10.3],
  ])('%s ⌀9.8 … 10.0, ⌀0.1: VC and RC as worked out, band (t + T)/2 = 0.15 either way', (_name, condition, vc, rc) => {
    const tolerance: GeometricTolerance = { kind: 'geometric', characteristic: 'position', zone: 0.1, featureSize: { min: 9.8, max: 10 }, stackTo: 'far-surface', ...condition }
    const surface = surfaceBoundary(tolerance)
    expect(surface?.virtualCondition).toBeCloseTo(vc, 12)
    expect(surface?.resultantCondition).toBeCloseTo(rc, 12)
    // |RC − VC| = 2(t + T) = 0.6, so the radius band is 0.3 wide: ±0.15.
    const { upper, lower } = geometricDeviations(tolerance)
    expect(upper - lower).toBeCloseTo(0.3, 12)
  })

  it('stacked to the axis (the default) or at RFS there is no surface boundary', () => {
    expect(surfaceBoundary({ ...plateHole('axis') })).toBeNull()
    expect(surfaceBoundary({ ...plateHole('near-surface'), materialCondition: 'rfs' })).toBeNull()
  })
})

describe('seats on its high points: flatness / straightness one-sided', () => {
  it('flatness 0.05, adding material makes the dimension larger: 0 / −0.05 → mean −0.025 ± 0.025', () => {
    const result = row({ characteristic: 'flatness', zone: 0.05, highPoints: { materialSide: 'larger' } }, 8)
    expect(result.max).toBeCloseTo(8, 12)
    expect(result.min).toBeCloseTo(7.95, 12)
    expect(result.halfBand).toBeCloseTo(0.025, 12)
    expect(result.conversion.modifiers.join(' ')).toMatch(/high points/)
  })

  it('material side smaller: 0 / +0.05; under ASME the note names Rule #1, §5', () => {
    const { upper, lower, conversion } = geometricDeviations({ kind: 'geometric', characteristic: 'straightness', zone: 0.05, highPoints: { materialSide: 'smaller' } }, 'asme')
    expect(upper).toBeCloseTo(0.05, 12)
    expect(lower).toBeCloseTo(0, 12)
    expect(conversion.modifiers.join(' ')).toMatch(/Rule #1 \(ASME Y14.5-2018 §5\)/)
  })
})

describe('ISO UZ offset and ASME Ⓤ value', () => {
  it('UZ offset v ↔ Ⓤ value t/2 + v', () => {
    expect(unequalValueFromIsoOffset(0.3, 0.05)).toBeCloseTo(0.2, 12)
    expect(isoOffsetFromUnequalValue(0.3, 0.2)).toBeCloseTo(0.05, 12)
  })

  it('ISO UZ+0.2 on t 0.2: the zone lies wholly outside the material, +0.3 … +0.1', () => {
    // value = t/2 + v = 0.1 + 0.2 = 0.3 on the + side, so −(0.2 − 0.3) = +0.1 below.
    const tolerance: GeometricTolerance = { kind: 'geometric', characteristic: 'profile-surface', zone: 0.2,
      unequal: { value: unequalValueFromIsoOffset(0.2, 0.2), materialSide: 'larger' }, datums: [{ letter: 'A', modifier: 'rmb' }] }
    const { upper, lower } = geometricDeviations(tolerance, 'iso')
    expect(upper).toBeCloseTo(0.3, 12)
    expect(lower).toBeCloseTo(0.1, 12)
    const contributors: Contributor[] = [{ kind: 'dimension', label: 'Face', sensitivity: 1, nominal: 5, tolerance }]
    expectOk(analyseStack({ name: 'x', standard: 'iso', contributors }))
    expect(analyseStack({ name: 'x', standard: 'asme', contributors })).toEqual({ ok: false, error: expect.stringMatching(/Ⓤ value must lie between 0/) })
  })
})

describe('what each standard offers (S6)', () => {
  it('concentricity and symmetry are ISO only', () => {
    expect(characteristicsOf('iso')).toEqual(GEOMETRIC_CHARACTERISTICS)
    expect(characteristicsOf('asme')).not.toContain('coaxiality')
    expect(characteristicsOf('asme')).not.toContain('symmetry')
    expect(geometricAvailability('symmetry', 'asme').inStandard).toBe(false)
  })

  it('CZ is ISO only; Ⓣ on orientation and profile, and on position under ISO', () => {
    expect(acceptsCombinedZone('position', 'iso')).toBe(true)
    expect(acceptsCombinedZone('position', 'asme')).toBe(false)
    expect(acceptsTangentPlane('parallelism', 'asme')).toBe(true)
    expect(acceptsTangentPlane('profile-surface', 'asme')).toBe(true)
    expect(acceptsTangentPlane('position', 'iso')).toBe(true)
    expect(acceptsTangentPlane('position', 'asme')).toBe(false)
    expect(acceptsTangentPlane('flatness', 'iso')).toBe(false)
    expect(acceptsTangentPlane('total-runout', 'iso')).toBe(false)
  })

  it('surface boundary: position in both, coaxiality / symmetry under ISO; high points on form only', () => {
    expect(acceptsSurfaceBoundary('position', 'asme')).toBe(true)
    expect(acceptsSurfaceBoundary('coaxiality', 'iso')).toBe(true)
    expect(acceptsSurfaceBoundary('coaxiality', 'asme')).toBe(false)
    expect(acceptsSurfaceBoundary('perpendicularity', 'iso')).toBe(false)
    expect(geometricAvailability('flatness', 'iso')).toMatchObject({ highPoints: true, datums: false, unequal: false, freeState: true })
    expect(geometricAvailability('profile-surface', 'asme')).toMatchObject({ unequal: true, materialCondition: false, tangentPlane: true })
  })

  it('warnings name the row: ASME symmetry, CZ under ASME, Ⓣ on position under ASME, line profile without datums', () => {
    const g = (label: string, tolerance: Omit<GeometricTolerance, 'kind'>): Contributor =>
      ({ kind: 'dimension', label, sensitivity: 1, nominal: 0, tolerance: { kind: 'geometric', ...tolerance } })
    const analysis = expectOk(analyseStack({ name: 'x', standard: 'asme', contributors: [
      g('Slot', { characteristic: 'symmetry', zone: 0.1 }), g('Hole', { characteristic: 'position', zone: 0.1, commonZone: true, tangentPlane: true }),
      g('Edge', { characteristic: 'profile-line', zone: 0.1 }),
    ] }))
    expect(analysis.warnings).toEqual([
      expect.stringMatching(/^Row 1 "Slot": symmetry is not in ASME Y14.5-2018/),
      expect.stringMatching(/^Row 2 "Hole": Ⓣ .* not used on position/),
      expect.stringMatching(/^Row 2 "Hole": CZ \(combined zone\)/),
      expect.stringMatching(/^Row 3 "Edge": a line profile without datums/),
    ])
    expect(expectOk(analyseStack({ name: 'x', standard: 'iso', contributors: [g('Slot', { characteristic: 'symmetry', zone: 0.1 })] })).warnings).toEqual([])
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

  it('a profile with a datum at MMB keeps its Ⓤ band (the shift is its own row)', () => {
    const { upper, lower } = geometricDeviations({ kind: 'geometric', characteristic: 'profile-surface', zone: 0.3,
      unequal: { value: 0.1, materialSide: 'larger' }, datums: [{ letter: 'B', modifier: 'mmb', size: { min: 12, max: 12.04 } }] })
    expect(upper).toBeCloseTo(0.1, 12)
    expect(lower).toBeCloseTo(-0.2, 12)
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
  it('axial runout does not locate the face; orientation H/L note; position points to the surface option', () => {
    expect(geometricRule('circular-runout').appliesWhen).toMatch(/does not locate the face/)
    expect(geometricRule('perpendicularity').unsure).toMatch(/t·H\/L/)
    expect(geometricRule('position').appliesWhen).toMatch(/stack to the feature surface/)
  })

  it('form tolerances: Rule #1 (§5) for ASME, independency for ISO', () => {
    expect(geometricRule('flatness', 'asme').appliesWhen).toMatch(/Rule #1 \(envelope, ASME Y14.5-2018 §5\)/)
    expect(geometricRule('flatness', 'iso').appliesWhen).toMatch(/ISO 8015/)
    expect(geometricRule('position', 'asme').appliesWhen).toBe(geometricRule('position', 'iso').appliesWhen)
  })
})
