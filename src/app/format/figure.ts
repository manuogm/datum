// A library figure as a list writes it: "WC 20.825 … 21.095 mm". A length
// figure that carries its numbers (SnapshotFigure.lengthsMm) is written in
// the viewer's unit system; any other, or one stored before the numbers
// were kept, is written as stored.
import type { SnapshotFigure } from '../../core/library'
import { formatQuantity, unitOf, type UnitSystem } from '../../core/units'

/** The figure's value and unit in this unit system. */
export function figureValue(figure: SnapshotFigure, system: UnitSystem): { value: string; unit?: string } {
  const lengths = figure.lengthsMm
  const readable = Array.isArray(lengths) && lengths.length >= 1 && lengths.length <= 2 && lengths.every((n) => typeof n === 'number' && Number.isFinite(n))
  if (system === 'si' || !readable) return { value: figure.value, ...(figure.unit ? { unit: figure.unit } : {}) }
  return { value: lengths.map((mm) => formatQuantity('length', system, mm)).join(' … '), unit: unitOf('length', system) }
}

/** "WC 20.825 … 21.095 mm", "u max 2.01". */
export function figureText(figure: SnapshotFigure, system: UnitSystem): string {
  const { value, unit } = figureValue(figure, system)
  return `${figure.label} ${value}${unit ? ` ${unit}` : ''}`
}
