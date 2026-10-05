import { fail, ok, type Result } from '../../../core/result'

/**
 * Bolt property classes: carbon and alloy steel per ISO 898-1:2013 and
 * austenitic stainless steel per ISO 3506-1:2020.
 */
export const PROPERTY_CLASSES = ['8.8', '10.9', '12.9', 'A2-70', 'A4-70', 'A2-80', 'A4-80'] as const
export type PropertyClass = (typeof PROPERTY_CLASSES)[number]

export interface BoltMaterial {
  readonly propertyClass: PropertyClass
  readonly standard: string
  readonly stainless: boolean
  /** Minimum 0.2 % proof stress Rp0.2 (ISO 898-1 Table 3 / ISO 3506-1 Table 6). */
  readonly proofStressMPa: number
  /** Minimum tensile strength Rm. */
  readonly tensileStrengthMPa: number
  /** Young's modulus ES at room temperature. */
  readonly youngsModulusMPa: number
  /** Mean coefficient of linear thermal expansion αS, 20 … 100 °C. */
  readonly thermalExpansionUmPerMK: number
}

/**
 * ES = 205 000 N/mm² for steel bolts is the value VDI 2230-1:2015 uses in its
 * examples. α = 11.5 µm/(m·K) for quenched and tempered bolt steels.
 * UNSURE: α recalled as typical of 34CrMo4 / 42CrMo4 type steels (11.1 … 12.0 between sources).
 * Stainless: E and α of 1.4401 (316) from EN 10088-1, as for A4-80 in the
 * materials database (304 / A2 has the same values to the precision used here).
 */
const STEEL_BOLT = { youngsModulusMPa: 205_000, thermalExpansionUmPerMK: 11.5 } as const
const STAINLESS_BOLT = { youngsModulusMPa: 200_000, thermalExpansionUmPerMK: 16.0 } as const

/**
 * ISO 898-1:2013 Table 3 minimums. Class 8.8 is weaker up to M16 than above:
 * Rp0.2 640 / Rm 800 MPa for d ≤ 16 mm, 660 / 830 MPa for d > 16 mm.
 * ISO 3506-1:2020: class 70 Rp0.2 450 / Rm 700 MPa, class 80 600 / 800 MPa.
 * UNSURE: the 2020 edition extends classes 70 and 80 to M39; older editions
 * limited them to M24 (class 70 bars above M20 may come hot-forged with lower values).
 */
export function boltMaterial(propertyClass: PropertyClass, nominalMm: number): Result<BoltMaterial> {
  const iso898 = (proofStressMPa: number, tensileStrengthMPa: number): BoltMaterial =>
    ({ propertyClass, standard: 'ISO 898-1', stainless: false, proofStressMPa, tensileStrengthMPa, ...STEEL_BOLT })
  const iso3506 = (proofStressMPa: number, tensileStrengthMPa: number): BoltMaterial =>
    ({ propertyClass, standard: 'ISO 3506-1', stainless: true, proofStressMPa, tensileStrengthMPa, ...STAINLESS_BOLT })
  switch (propertyClass) {
    case '8.8': return ok(nominalMm <= 16 ? iso898(640, 800) : iso898(660, 830))
    case '10.9': return ok(iso898(940, 1040))
    case '12.9': return ok(iso898(1100, 1220))
    case 'A2-70': case 'A4-70': return ok(iso3506(450, 700))
    case 'A2-80': case 'A4-80': return ok(iso3506(600, 800))
    default: return fail(`Property class "${String(propertyClass)}" is not covered; choose one of ${PROPERTY_CLASSES.join(', ')}.`)
  }
}
