import type { SourceId } from './sources'

/** Material families, as filtered on the Materials Database screen. */
export const MATERIAL_FAMILIES = {
  aluminium: 'Aluminium',
  titanium: 'Titanium',
  steel: 'Steel',
  'cast-iron': 'Cast iron',
  nickel: 'Nickel',
  magnesium: 'Magnesium',
  copper: 'Copper',
  composite: 'Composite',
  polymer: 'Polymer',
} as const

export type MaterialFamily = keyof typeof MATERIAL_FAMILIES

/** High-cycle fatigue strength (fully reversed, unnotched) and the life it refers to. */
export interface FatigueStrength {
  readonly strengthMPa: number
  readonly cycles: number
}

/**
 * Properties of one material at room temperature (20 °C unless the source says otherwise).
 *
 * `null` means "not given": either the property does not apply (composites and
 * brittle cast irons have no 0.2 % proof stress) or no source is held for it.
 * Mechanical strengths are typical values unless the source is a standard, in
 * which case they are that standard's specified minimum for the stated condition.
 * None of them are design allowables (A-/B-basis).
 */
export interface Material {
  /** Stable key, e.g. 'al-7075-t6'. */
  readonly id: string
  /** Display name, e.g. 'Al 7075-T6'. */
  readonly name: string
  readonly family: MaterialFamily
  /** Material specification, e.g. 'AMS 4045' or 'EN 10083-3'. */
  readonly spec: string
  /** Heat treatment / product form the values refer to. */
  readonly condition: string
  /** Unified Numbering System or EN material number, when one applies. */
  readonly designation?: string
  readonly densityGPerCm3: number
  /** Young's modulus E (in-plane for composites). */
  readonly youngsModulusGPa: number
  readonly poissonsRatio: number | null
  /** 0.2 % proof stress Rp0.2. */
  readonly yieldStrengthMPa: number | null
  /** Tensile strength Rm. */
  readonly tensileStrengthMPa: number | null
  /** Elongation after fracture A. */
  readonly elongationPercent: number | null
  /**
   * Mean coefficient of linear thermal expansion α, 20 … 100 °C unless a
   * comment says otherwise. 1 µm/(m·K) = 10⁻⁶ /K.
   */
  readonly thermalExpansionUmPerMK: number
  readonly thermalConductivityWPerMK: number | null
  readonly fatigue: FatigueStrength | null
  /**
   * Indicative upper temperature for sustained service without significant
   * loss of strength (over-ageing, tempering, softening). Always a Datum
   * judgement for screening (SOURCES.judgement), not a value from a standard.
   */
  readonly maxServiceTempC: number
  /** Source of each MaterialProperty: `default`, unless `overrides` names another one for that property. */
  readonly sources: {
    readonly default: SourceId
    readonly overrides?: Partial<Record<MaterialProperty, SourceId>>
  }
}

/** The properties taken from a source (maxServiceTempC is always SOURCES.judgement). */
export type MaterialProperty =
  | 'densityGPerCm3' | 'youngsModulusGPa' | 'poissonsRatio' | 'yieldStrengthMPa'
  | 'tensileStrengthMPa' | 'elongationPercent' | 'thermalExpansionUmPerMK'
  | 'thermalConductivityWPerMK' | 'fatigue'
