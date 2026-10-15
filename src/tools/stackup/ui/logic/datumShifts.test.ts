import { describe, expect, it } from 'vitest'
import { expectOk } from '../../../../core/testing'
import { analyseStack, type StackResult } from '../../calc'
import { stackInputsFrom } from '../state/readInputs'
import { stackReducer } from '../state/stackReducer'
import {
  NEW_STACK_INPUTS, emptyDatum, newDatumShift, newDimension, newGeometric,
  type DatumCell, type GeometricEntry, type StackInputs, type StackRow,
} from '../state/stackInputs'
import { shiftSuggestions, shiftText, warningsByRow } from './datumShifts'
import { engineInput, offersHighPoints, offersSurface, rowLabel } from './engineInput'
import { recordedStack } from './links'
import { highPointsReadout, surfaceReadout } from './readouts'

/** Datum B at MMB, a hole 10.0 … 10.1: shift up to 0.1. */
const datumB: DatumCell = { ...emptyDatum(), letter: 'B', modifier: 'mmb', feature: { type: 'internal', min: 10, max: 10.1 } }
const frameAB: DatumCell[] = [{ ...emptyDatum(), letter: 'A' }, datumB, emptyDatum()]

const position = (changes: Partial<GeometricEntry> = {}): GeometricEntry => ({ ...newGeometric('position', 0.1), datums: frameAB, ...changes })
const geometricRow = (id: string, entry: GeometricEntry, nominal = 20): StackRow => ({ ...newDimension(id, entry), nominal })
const part = (...rows: StackRow[]): StackInputs => ({ ...NEW_STACK_INPUTS, rows })
const analysed = (inputs: StackInputs) => expectOk(analyseStack(engineInput(inputs, new Map())))

describe('datum shift rows', () => {
  it('goes to the engine as its own row, labelled by its frame', () => {
    const shift = newDatumShift('r2', frameAB)
    const inputs = part(geometricRow('r1', position()), shift)
    const contributor = engineInput(inputs, new Map()).contributors[1]
    expect(contributor).toMatchObject({ kind: 'datum-shift', label: 'Datum shift A|B(M)', sensitivity: 1 })
    expect(rowLabel(shift, 1)).toBe('Datum shift A|B(M)')
    expect(shiftText({ ...shift, frame: 'Housing' })).toBe('datum shift A|B(M) · Housing')
    // 0 ± shift/2 (ASME Y14.5-2018 §7): the shift of B is its size tolerance 0.1.
    const row = analysed(inputs).contributors[1]
    expect(row.nominal).toBe(0)
    expect(row.halfBand).toBeCloseTo(0.05, 12)
  })

  it('is offered, not added, on the first row of a frame with MMB/LMB and no datum-shift row', () => {
    const inputs = part(geometricRow('r1', position()), geometricRow('r2', position(), 5))
    const suggestions = shiftSuggestions(inputs, engineInput(inputs, new Map()))
    expect([...suggestions.keys()]).toEqual(['r1'])
    expect(suggestions.get('r1')).toMatchObject({ frame: 'A|B(M)', datums: frameAB })
    expect(suggestions.get('r1')?.shift).toBeCloseTo(0.1, 12)
    // The row is not in the chain until the offer is taken.
    expect(inputs.rows).toHaveLength(2)

    // One click: the row, right after the row that offered it, with its frame.
    const added = stackReducer(inputs, { type: 'addDatumShift', datums: suggestions.get('r1')?.datums, after: 'r1' })
    expect(added.rows.map((row) => row.kind)).toEqual(['dimension', 'datum-shift', 'dimension'])
    expect(shiftSuggestions(added, engineInput(added, new Map())).size).toBe(0)
  })

  it('offers nothing at RMB, nor on runout (its datums are always RMB)', () => {
    const rmb = part(geometricRow('r1', position({ datums: [{ ...emptyDatum(), letter: 'A' }, { ...datumB, modifier: 'rmb' }, emptyDatum()] })))
    expect(shiftSuggestions(rmb, engineInput(rmb, new Map())).size).toBe(0)
    const runout = part(geometricRow('r1', { ...newGeometric('circular-runout', 0.05), datums: frameAB }))
    expect(shiftSuggestions(runout, engineInput(runout, new Map())).size).toBe(0)
  })

  it('offers the row before the datum sizes are in, with no shift yet', () => {
    const noSize = { ...datumB, feature: { type: 'internal' as const, min: null, max: null } }
    const inputs = part(geometricRow('r1', position({ datums: [frameAB[0], noSize, emptyDatum()] })))
    expect(shiftSuggestions(inputs, engineInput(inputs, new Map())).get('r1')).toMatchObject({ frame: 'A|B(M)', shift: null })
  })

  it('sorts the engine warnings by the row they name', () => {
    const { rows, chain } = warningsByRow(['Row 2 "Pin": check this.', 'Row 2 "Pin": and this.', 'Row 10 "x": far down.', 'The chain as a whole.'])
    expect(rows.get(1)).toHaveLength(2)
    expect(rows.get(9)).toEqual(['Row 10 "x": far down.'])
    expect(chain).toEqual(['The chain as a whole.'])
    // The engine warns on the row with MMB/LMB and no datum-shift row; once the row is in, it does not.
    const without = analysed(part(geometricRow('r1', position())))
    expect(warningsByRow(without.warnings).rows.get(0)?.join(' ')).toMatch(/datum-shift row/)
    const withShift = analysed(part(geometricRow('r1', position()), newDatumShift('r2', frameAB)))
    expect(withShift.warnings).toEqual([])
  })

  it('is kept by the reducer and read back from storage', () => {
    let inputs = stackReducer(part(geometricRow('r1', position())), { type: 'addDatumShift' })
    expect(inputs.rows[1]).toEqual(newDatumShift('r2'))
    inputs = stackReducer(inputs, { type: 'datumShift', id: 'r2', changes: { datums: frameAB, frame: 'Housing', source: 'dwg 12' } })
    expect(inputs.rows[1]).toMatchObject({ kind: 'datum-shift', frame: 'Housing', source: 'dwg 12' })
    // Part mode keeps it (only linked rows belong to an assembly).
    expect(stackReducer({ ...inputs, mode: 'assembly' }, { type: 'mode', mode: 'part' }).rows).toHaveLength(2)
    expect(stackInputsFrom(JSON.parse(JSON.stringify(inputs)))).toEqual(inputs)
  })
})

describe('stack to the feature surface (Ⓜ/Ⓛ)', () => {
  // Engine notes §3 review example: hole Ø10.0 … 10.2 at basic 20, position Ø0.1 Ⓜ; VC 9.9, RC 10.5.
  const hole = position({ diameterZone: true, materialCondition: 'mmc', feature: { type: 'internal', min: 10, max: 10.2 }, datums: [emptyDatum(), emptyDatum(), emptyDatum()] })

  it('is offered with Ⓜ/Ⓛ on position, not at RFS, and not on coaxiality under ASME (ISO only)', () => {
    expect(offersSurface(hole, 'iso')).toBe(true)
    expect(offersSurface({ ...hole, materialCondition: 'rfs' }, 'iso')).toBe(false)
    expect(offersSurface({ ...hole, characteristic: 'coaxiality' }, 'iso')).toBe(true)
    expect(offersSurface({ ...hole, characteristic: 'coaxiality' }, 'asme')).toBe(false)
    expect(offersSurface({ ...hole, characteristic: 'perpendicularity' }, 'iso')).toBe(false)
  })

  it('goes to the near surface between VC and RC, and only when offered', () => {
    const near = analysed(part(geometricRow('r1', { ...hole, stackTo: 'near-surface' }))).contributors[0]
    expect(near.min).toBeCloseTo(14.75, 9)
    expect(near.max).toBeCloseTo(15.05, 9)
    const surface = near.geometric?.surface
    expect(surface).toMatchObject({ virtualCondition: expect.closeTo(9.9, 9), resultantCondition: expect.closeTo(10.5, 9) })
    if (!surface) throw new Error('a surface row has its boundaries')
    expect(surfaceReadout('si', surface)).toEqual([
      'VC Ø9.900 · RC Ø10.500 → surface 4.950 … 5.250 from the axis',
      'near surface: basic − r, r = (VC + RC)/4 ± (t + T)/2 = 5.100 ±0.150',
    ])
    // At RFS the choice is not shown, so it is not sent either: to the axis.
    const rfs = engineInput(part(geometricRow('r1', { ...hole, materialCondition: 'rfs', stackTo: 'near-surface' })), new Map()).contributors[0]
    expect(rfs.kind === 'dimension' && rfs.tolerance.kind === 'geometric' && rfs.tolerance.stackTo).toBeUndefined()
  })
})

describe('seated on its high points (flatness, straightness)', () => {
  const flat: GeometricEntry = { ...newGeometric('flatness', 0.05), highPoints: { on: true, materialSide: 'larger' } }

  it('is offered on form at RFS only', () => {
    expect(offersHighPoints(flat, 'asme')).toBe(true)
    expect(offersHighPoints({ ...flat, characteristic: 'straightness' }, 'iso')).toBe(true)
    expect(offersHighPoints({ ...flat, characteristic: 'parallelism' }, 'iso')).toBe(false)
    expect(offersHighPoints({ ...flat, characteristic: 'straightness', materialCondition: 'mmc' }, 'iso')).toBe(false)
  })

  it('makes the row one-sided, 0 / −t into the material', () => {
    const row = analysed(part(geometricRow('r1', flat, 0))).contributors[0]
    expect(row.max).toBeCloseTo(0, 12)
    expect(row.min).toBeCloseTo(-0.05, 12)
    expect(highPointsReadout('si', flat)).toBe('0 / −0.050 into the material')
    // Switched off: centred ±t/2.
    const centred = analysed(part(geometricRow('r1', { ...flat, highPoints: { ...flat.highPoints, on: false } }, 0))).contributors[0]
    expect(centred.max).toBeCloseTo(0.025, 12)
  })
})

describe('recordedStack', () => {
  it('keeps the two parts of the worst-case band, rounded, when the result has them', () => {
    const stack: StackResult = { name: 'P', nominal: 1, mean: 1, upperDeviation: 0.3, lowerDeviation: -0.3, sigma: 0.1, arithmeticHalfBand: 0.1 + 0.2, statisticalHalfBand: 0 }
    expect(recordedStack(stack)).toMatchObject({ arithmeticHalfBand: 0.3, statisticalHalfBand: 0 })
    const { arithmeticHalfBand: _a, statisticalHalfBand: _s, ...older } = stack
    expect(recordedStack(older)).not.toHaveProperty('arithmeticHalfBand')
  })
})
