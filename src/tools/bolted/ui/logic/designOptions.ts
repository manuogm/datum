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

/** Tightening method, µG and µK: most joints keep a torque wrench at µ 0.12. */
const TIGHTENING_KEYS = ['tightening', 'threadFriction', 'headFriction'] as const

/** µT and qF, the friction against slip. */
const SLIP_KEYS = ['interfaceFriction', 'frictionInterfaces'] as const

const changedOf = (design: JointDesignSpec, keys: readonly (keyof JointDesignSpec)[]): OptionCount => ({
  count: keys.length,
  changed: keys.filter((key) => design[key] !== DEFAULT_JOINT_DESIGN[key]).length,
})

export function tighteningOptions(design: JointDesignSpec): OptionCount {
  return changedOf(design, TIGHTENING_KEYS)
}

/** The single joint asks for these beside FQ; a pattern's joint type keeps them under More options. */
export function slipOptions(design: JointDesignSpec): OptionCount {
  return changedOf(design, SLIP_KEYS)
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
