// The advanced inputs of a joint design that sit under "More options": how
// many there are and how many differ from the tool's defaults, so the closed
// row still says when a hidden setting has been changed.
import { DEFAULT_JOINT_DESIGN, type JointDesignSpec } from '../state/boltInputs'
import { needsLimitingPressure } from './designEdits'

export interface OptionCount {
  /** Inputs behind the row. */
  readonly count: number
  /** Of those, how many differ from their defaults. */
  readonly changed: number
}

/** Washers, tightening method, µG, µK, µT and qF: most joints keep a torque wrench at µ 0.12. */
const TIGHTENING_KEYS = ['washers', 'tightening', 'threadFriction', 'headFriction', 'interfaceFriction', 'frictionInterfaces'] as const

export function tighteningOptions(design: JointDesignSpec): OptionCount {
  const changed = TIGHTENING_KEYS.filter((key) => design[key] !== DEFAULT_JOINT_DESIGN[key]).length
  return { count: TIGHTENING_KEYS.length, changed }
}

/**
 * pG of each metal part (the table value unless entered), the surface
 * roughness and where the load enters the parts. The pG of a polymer or
 * composite part is required, so it is asked for beside the part instead.
 */
export function contactOptions(design: JointDesignSpec): OptionCount {
  const optional = design.plates.filter((plate) => !needsLimitingPressure(plate.materialId))
  const entered = optional.filter((plate) => plate.limitingPressureMPa !== undefined).length
  const changed = entered
    + Number(design.surfaceRoughness !== DEFAULT_JOINT_DESIGN.surfaceRoughness)
    + Number(design.loadIntroduction !== DEFAULT_JOINT_DESIGN.loadIntroduction)
  return { count: optional.length + 2, changed }
}
