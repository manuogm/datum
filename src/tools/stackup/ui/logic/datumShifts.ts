// Datum shift as its own row (engine notes §3, §7). A frame with a datum at
// MMB/LMB lets the part shift on its datum simulators; the shift belongs in
// the chain once per datum reference frame, and only where the chain
// crosses the datum feature's interface with its mating part or fixture
// (ASME Y14.5-2018 §7; ISO 2692:2021; Fischer 2011). So it is never added
// on its own: a geometric row whose frame has MMB/LMB and no datum-shift
// row offers one, in one click (the engine's datumShiftRowsFor gives the
// rows a calculation saved before this needs, with their shift).
import { GEOMETRIC_RULES, datumFrameText, datumShiftRowsFor, frameDatumShift, hasDatumBoundary, type StackInput } from '../../calc'
import type { DatumCell, DatumShiftRow, GeometricEntry, StackInputs } from '../state/stackInputs'
import { shiftDatums } from './engineInput'

/** A datum-shift row a geometric row offers: its frame, the datum cells to copy, and the shift when the sizes are in. */
export interface ShiftSuggestion {
  /** "A|B(M)". */
  readonly frame: string
  readonly datums: readonly DatumCell[]
  /** The largest shift of the frame, from the datum sizes on the row; null while they are not entered. */
  readonly shift: number | null
}

/** The frame of a geometric entry's datum cells as the engine writes it: "A|B(M)". */
const frameOf = (datums: readonly DatumCell[]): string => datumFrameText(shiftDatums({ datums }))

/** A datum-shift row's tolerance in text: "datum shift A|B(M)", with its frame name when it has one ("… · Housing"). */
export function shiftText(row: Pick<DatumShiftRow, 'datums' | 'frame'>): string {
  const frame = frameOf(row.datums)
  return `datum shift ${frame || '—'}${row.frame.trim() ? ` · ${row.frame.trim()}` : ''}`
}

/**
 * The datum-shift row each geometric row offers, by row id: the first row
 * of each frame that has a datum at MMB/LMB and no datum-shift row in the
 * chain yet (frames compared by their letters and modifiers, as the engine
 * does). `input` is the engine input of the same inputs (engineInput), for
 * the engine's own rows and their shift.
 */
export function shiftSuggestions(inputs: StackInputs, input: StackInput): ReadonlyMap<string, ShiftSuggestion> {
  const engineRows = new Map(datumShiftRowsFor(input.contributors).map((row) => [datumFrameText(row.datums).toUpperCase(), row]))
  const present = new Set(inputs.rows.flatMap((row) => (row.kind === 'datum-shift' ? [frameOf(row.datums).toUpperCase()] : [])))
  const suggestions = new Map<string, ShiftSuggestion>()
  for (const row of inputs.rows) {
    if (row.kind !== 'dimension' || row.tolerance.kind !== 'geometric') continue
    const entry: GeometricEntry = row.tolerance
    // Only where the characteristic takes MMB/LMB on its datums (not runout or form).
    if (!GEOMETRIC_RULES[entry.characteristic].datumBoundary) continue
    const references = shiftDatums(entry)
    const frame = datumFrameText(references)
    const key = frame.toUpperCase()
    if (!hasDatumBoundary(references) || present.has(key)) continue
    present.add(key)
    const engineRow = engineRows.get(key)
    const shift = engineRow ? frameDatumShift(engineRow.datums) : null
    suggestions.set(row.id, { frame, datums: entry.datums, shift: shift !== null && Number.isFinite(shift) && shift > 0 ? shift : null })
  }
  return suggestions
}

/**
 * The engine's warnings ("Row 3 …: …") by row index (0-based), and those
 * that name no row. Each is a thing to check, never an error.
 */
export function warningsByRow(warnings: readonly string[]): { rows: ReadonlyMap<number, readonly string[]>; chain: readonly string[] } {
  const rows = new Map<number, string[]>()
  const chain: string[] = []
  for (const warning of warnings) {
    const match = /^Row (\d+)\b/.exec(warning)
    if (!match) {
      chain.push(warning)
      continue
    }
    const index = Number(match[1]) - 1
    rows.set(index, [...(rows.get(index) ?? []), warning])
  }
  return { rows, chain }
}
