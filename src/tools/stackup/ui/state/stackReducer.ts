// How the Tolerance Stack-up inputs change. Every edit on the screen is one
// of these actions; the reducer is pure so it can be tested on its own.
import { MAX_CONTRIBUTORS, type DrawingStandard } from '../../calc'
import { stackName } from '../logic/engineInput'
import { unequalInStandard } from '../logic/unequal'
import {
  newDatumShift, newDimension, newGeometric,
  type DatumCell, type DatumShiftRow, type DimensionRow, type GeometricEntry, type LinkSnapshot, type LinkedRow, type StackInputs, type StackMode, type StackRow,
  type ToleranceEntry, type ToleranceKind,
} from './stackInputs'

export type StackAction =
  /** Plain edits of top-level fields (names, requirement, method, standard, end labels). */
  | { type: 'change'; changes: Partial<Omit<StackInputs, 'rows' | 'mode'>> }
  /** Part ↔ Assembly. Going to Part drops the linked rows (only an assembly links part stacks). */
  | { type: 'mode'; mode: StackMode }
  /** Appends a dimension with a ± tolerance, or with a geometric tolerance. */
  | { type: 'addDimension'; geometric?: boolean }
  /**
   * A datum-shift row for one datum reference frame: empty, or with the
   * frame of a geometric row (its suggestion), placed right after that row.
   */
  | { type: 'addDatumShift'; datums?: readonly DatumCell[]; after?: string }
  | { type: 'datumShift'; id: string; changes: Partial<Pick<DatumShiftRow, 'label' | 'datums' | 'frame' | 'source'>> }
  /** Appends a linked part stack, adding (+). */
  | { type: 'addLink'; calcId: string; last: LinkSnapshot }
  | { type: 'row'; id: string; changes: Partial<Pick<DimensionRow, 'label' | 'nominal' | 'statistical' | 'source'>> }
  /** +1 ↔ −1 (±½ stays a half). */
  | { type: 'flip'; id: string }
  /** "Count half of it": a coefficient of ±½ instead of ±1. */
  | { type: 'half'; id: string; on: boolean }
  | { type: 'tolerance'; id: string; tolerance: ToleranceEntry }
  /** Another kind of tolerance, keeping the band where it can. */
  | { type: 'toleranceKind'; id: string; kind: ToleranceKind }
  | { type: 'geometric'; id: string; changes: Partial<GeometricEntry> }
  /** Another part stack for a linked row (Change link…, Relink…). */
  | { type: 'relink'; id: string; calcId: string; last: LinkSnapshot }
  /** A linked row becomes a dimension with the part's nominal and worst-case deviations (its σ is not kept). */
  | { type: 'toDimension'; id: string }
  | { type: 'duplicate'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'move'; from: number; to: number }
  /** Reset: an empty chain. */
  | { type: 'clearRows' }

/** An id no row of the chain has: r1, r2 … */
export function nextRowId(rows: readonly StackRow[]): string {
  const taken = new Set(rows.map((row) => row.id))
  let n = rows.length + 1
  while (taken.has(`r${n}`)) n++
  return `r${n}`
}

export function stackReducer(inputs: StackInputs, action: StackAction): StackInputs {
  const { rows } = inputs
  const withRows = (next: readonly StackRow[]): StackInputs => ({ ...inputs, rows: next })
  const append = (row: StackRow) => (rows.length >= MAX_CONTRIBUTORS ? inputs : withRows([...rows, row]))
  const dimension = (id: string, change: (row: DimensionRow) => DimensionRow) =>
    withRows(rows.map((row) => (row.id === id && row.kind === 'dimension' ? change(row) : row)))
  switch (action.type) {
    case 'change': {
      const changed = { ...inputs, ...action.changes }
      return changed.standard === inputs.standard ? changed : inStandard(changed, changed.standard)
    }
    case 'mode':
      return { ...inputs, mode: action.mode, rows: action.mode === 'part' ? rows.filter((row) => row.kind !== 'linked') : rows }
    case 'addDimension': {
      const id = nextRowId(rows)
      return append(action.geometric ? { ...newDimension(id, newGeometric()), nominal: null } : newDimension(id))
    }
    case 'addDatumShift': {
      if (rows.length >= MAX_CONTRIBUTORS) return inputs
      const row = newDatumShift(nextRowId(rows), action.datums?.map((cell) => ({ ...cell })))
      const at = action.after === undefined ? -1 : rows.findIndex((r) => r.id === action.after)
      return withRows(at < 0 ? [...rows, row] : [...rows.slice(0, at + 1), row, ...rows.slice(at + 1)])
    }
    case 'datumShift':
      return withRows(rows.map((row) => (row.id === action.id && row.kind === 'datum-shift' ? { ...row, ...action.changes } : row)))
    case 'addLink':
      return append({ kind: 'linked', id: nextRowId(rows), sensitivity: 1, calcId: action.calcId, last: action.last })
    case 'row':
      return dimension(action.id, (row) => ({ ...row, ...action.changes }))
    case 'flip':
      return withRows(rows.map((row) => (row.id === action.id ? { ...row, sensitivity: -row.sensitivity } : row)))
    case 'half':
      return withRows(rows.map((row) => (row.id === action.id ? { ...row, sensitivity: Math.sign(row.sensitivity) * (action.on ? 0.5 : 1) } : row)))
    case 'tolerance':
      return dimension(action.id, (row) => ({ ...row, tolerance: action.tolerance }))
    case 'toleranceKind':
      return dimension(action.id, (row) => ({ ...row, tolerance: convertedTolerance(row, action.kind) }))
    case 'geometric':
      return dimension(action.id, (row) => (row.tolerance.kind === 'geometric' ? { ...row, tolerance: { ...row.tolerance, ...action.changes } } : row))
    case 'relink':
      return withRows(rows.map((row) => (row.id === action.id && row.kind === 'linked' ? { ...row, calcId: action.calcId, last: action.last } : row)))
    case 'toDimension':
      return withRows(rows.map((row) => (row.id === action.id && row.kind === 'linked' ? dimensionFromLink(row) : row)))
    case 'duplicate': {
      const at = rows.findIndex((row) => row.id === action.id)
      if (at < 0 || rows.length >= MAX_CONTRIBUTORS) return inputs
      const copy = { ...rows[at], id: nextRowId(rows) }
      return withRows([...rows.slice(0, at + 1), copy, ...rows.slice(at + 1)])
    }
    case 'remove':
      return withRows(rows.filter((row) => row.id !== action.id))
    case 'move':
      return withRows(moved(rows, action.from, action.to))
    case 'clearRows':
      return withRows([])
  }
}

/**
 * The inputs on a drawing of another standard: each Ⓤ / UZ number is
 * re-expressed in that standard's form (an ISO UZ offset ↔ an ASME Ⓤ
 * value) with its row's zone, so the field shows the drawing's own number
 * and later zone edits keep it (logic/unequal.ts).
 */
function inStandard(inputs: StackInputs, standard: DrawingStandard): StackInputs {
  return {
    ...inputs,
    rows: inputs.rows.map((row) =>
      row.kind === 'dimension' && row.tolerance.kind === 'geometric' ? { ...row, tolerance: unequalInStandard(row.tolerance, standard) } : row,
    ),
  }
}

/** The row's tolerance as deviations from its nominal (upper, lower), when they can be worked out. */
function deviationsOf(row: DimensionRow): { upper: number; lower: number } | null {
  const { tolerance, nominal } = row
  switch (tolerance.kind) {
    case 'symmetric':
      return tolerance.plusMinus === null ? null : { upper: tolerance.plusMinus, lower: -tolerance.plusMinus }
    case 'deviations':
      return tolerance.upper === null || tolerance.lower === null ? null : { upper: tolerance.upper, lower: tolerance.lower }
    case 'limits':
      return tolerance.min === null || tolerance.max === null || nominal === null ? null : { upper: tolerance.max - nominal, lower: tolerance.min - nominal }
    case 'geometric':
      return tolerance.zone === null ? null : { upper: tolerance.zone / 2, lower: -tolerance.zone / 2 }
  }
}

/**
 * The tolerance as another kind, keeping its band: ±t ↔ +t/−t ↔ limits
 * nominal − t … nominal + t; a geometric zone t from a band 2t wide. An
 * unequal band made ± keeps its width (centred on the nominal).
 */
export function convertedTolerance(row: DimensionRow, kind: ToleranceKind): ToleranceEntry {
  if (row.tolerance.kind === kind) return row.tolerance
  const band = deviationsOf(row)
  const round = (value: number) => Number(value.toPrecision(12))
  switch (kind) {
    case 'symmetric':
      return { kind, plusMinus: band ? round((band.upper - band.lower) / 2) : null }
    case 'deviations':
      return { kind, upper: band ? round(band.upper) : null, lower: band ? round(band.lower) : null }
    case 'limits': {
      const at = (deviation: number) => (row.nominal === null ? null : round(row.nominal + deviation))
      return { kind, min: band ? at(band.lower) : null, max: band ? at(band.upper) : null }
    }
    case 'geometric':
      return newGeometric('position', band ? round(band.upper - band.lower) : null)
  }
}

/** A linked part stack typed in as a dimension: its nominal and worst-case deviations, the same direction and name. */
function dimensionFromLink(row: LinkedRow): DimensionRow {
  const { stack, partName, resultName } = row.last
  return {
    ...newDimension(row.id, { kind: 'deviations', upper: stack.upperDeviation, lower: stack.lowerDeviation }),
    // Named as the part names its result: "Housing: shoulder to circlip groove".
    label: partName ? stackName({ mode: 'part', partName, resultName }) : resultName || stack.name,
    sensitivity: row.sensitivity,
    nominal: stack.nominal,
  }
}

function moved<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= items.length || to < 0 || to >= items.length) return [...items]
  const next = items.filter((_, i) => i !== from)
  next.splice(to, 0, items[from])
  return next
}
