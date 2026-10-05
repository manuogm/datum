/**
 * Unit systems for display. Calculations always run in SI (mm, µm, °C); the
 * screens convert to the viewer's unit system only when showing or reading a
 * value. Imperial shows lengths in inches, small deviations in thou
 * (0.001 in) and temperatures in °F.
 */

export const UNIT_SYSTEMS = ['si', 'imperial'] as const
export type UnitSystem = (typeof UNIT_SYSTEMS)[number]

/**
 * The kinds of quantity Datum shows:
 * - length: sizes such as a nominal diameter or a limit of size (SI unit mm);
 * - deviation: small differences such as tolerances and clearances (SI unit µm);
 * - temperature: °C;
 * - expansion: coefficient of linear thermal expansion α (SI unit µm/(m·K)).
 */
export type Quantity = 'length' | 'deviation' | 'temperature' | 'expansion'

interface DisplayUnit {
  readonly unit: string
  /** Decimals shown; trailing zeros are kept only when `fixed` is true. */
  readonly decimals: number
  readonly fixed: boolean
  readonly fromSi: (value: number) => number
  readonly toSi: (value: number) => number
}

const MM_PER_INCH = 25.4
const UM_PER_THOU = 25.4
const identity = (value: number) => value

const DISPLAY_UNITS: Record<Quantity, Record<UnitSystem, DisplayUnit>> = {
  length: {
    si: { unit: 'mm', decimals: 3, fixed: true, fromSi: identity, toSi: identity },
    imperial: { unit: 'in', decimals: 4, fixed: true, fromSi: (mm) => mm / MM_PER_INCH, toSi: (inch) => inch * MM_PER_INCH },
  },
  deviation: {
    si: { unit: 'µm', decimals: 1, fixed: false, fromSi: identity, toSi: identity },
    imperial: { unit: 'thou', decimals: 2, fixed: false, fromSi: (um) => um / UM_PER_THOU, toSi: (thou) => thou * UM_PER_THOU },
  },
  temperature: {
    si: { unit: '°C', decimals: 1, fixed: false, fromSi: identity, toSi: identity },
    imperial: { unit: '°F', decimals: 1, fixed: false, fromSi: (c) => (c * 9) / 5 + 32, toSi: (f) => ((f - 32) * 5) / 9 },
  },
  expansion: {
    si: { unit: 'µm/(m·K)', decimals: 1, fixed: false, fromSi: identity, toSi: identity },
    // 1 µm/(m·K) = 1e-6 /K = 1e-6 · 5/9 /°F = 5/9 µin/(in·°F)
    imperial: { unit: 'µin/(in·°F)', decimals: 1, fixed: false, fromSi: (a) => (a * 5) / 9, toSi: (a) => (a * 9) / 5 },
  },
}

/** Unit symbol shown next to a quantity, e.g. 'µm' or 'thou'. */
export function unitOf(quantity: Quantity, system: UnitSystem): string {
  return DISPLAY_UNITS[quantity][system].unit
}

/** SI value → value in the display unit of `system` (not rounded). */
export function toDisplay(quantity: Quantity, system: UnitSystem, siValue: number): number {
  return DISPLAY_UNITS[quantity][system].fromSi(siValue)
}

/** Value typed in the display unit of `system` → SI value. */
export function fromDisplay(quantity: Quantity, system: UnitSystem, displayValue: number): number {
  return DISPLAY_UNITS[quantity][system].toSi(displayValue)
}

export interface FormatOptions {
  /** Prefix positive values with '+' (for deviations such as ES +21). */
  readonly signed?: boolean
  /** Append the unit symbol after a space. */
  readonly withUnit?: boolean
}

/**
 * An SI value written in the display unit, rounded for reading:
 * formatQuantity('deviation', 'si', -7) → '−7', ('length', 'imperial', 25) → '0.9843'.
 * Uses a true minus sign and never shows "−0".
 */
export function formatQuantity(quantity: Quantity, system: UnitSystem, siValue: number, options: FormatOptions = {}): string {
  const { decimals, fixed, fromSi, unit } = DISPLAY_UNITS[quantity][system]
  const text = formatDecimal(fromSi(siValue), decimals, fixed, options.signed ?? false)
  return options.withUnit ? `${text} ${unit}` : text
}

/** 'min … max' in the display unit, e.g. '−20 … 140 °C'. */
export function formatQuantityRange(quantity: Quantity, system: UnitSystem, minSi: number, maxSi: number, withUnit = true): string {
  const range = `${formatQuantity(quantity, system, minSi)} … ${formatQuantity(quantity, system, maxSi)}`
  return withUnit ? `${range} ${unitOf(quantity, system)}` : range
}

/** Rounds to `decimals`; drops trailing zeros unless `fixed`. */
export function formatDecimal(value: number, decimals: number, fixed = false, signed = false): string {
  const factor = 10 ** decimals
  const rounded = Math.round(value * factor) / factor || 0
  const digits = fixed ? Math.abs(rounded).toFixed(decimals) : String(Math.abs(rounded))
  const sign = rounded < 0 ? '−' : signed && rounded > 0 ? '+' : ''
  return sign + digits
}

/**
 * Reads a number as people type it: accepts the true minus sign (−), a
 * leading '+', and a decimal comma. Returns null when the text is not a
 * complete number (empty, '-', '1e').
 */
export function parseDecimal(text: string): number | null {
  const normalised = text.trim().replace(/[−–]/g, '-').replace(',', '.')
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(normalised)) return null
  return Number(normalised)
}
