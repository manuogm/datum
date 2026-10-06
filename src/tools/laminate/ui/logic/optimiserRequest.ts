// What the optimiser panel asks the stacking-sequence optimiser: the loads,
// criterion and target on screen, one ply material (the top ply's), the
// ply directions the engineer allows and the largest laminate to search.
import { fail, ok, type Result } from '../../../../core/result'
import { DEFAULT_MAX_PLIES, type OptimiseInput } from '../../optimise'
import type { LaminateInputs } from '../state/lamInputs'
import { plyMaterialOf } from './lamResults'

/** Ply directions offered: 0° and 90° alone, the others as ±θ pairs (the optimiser keeps laminates balanced). */
export const DIRECTION_CHOICES: readonly number[] = [0, 30, 45, 60, 90]

export interface OptimiserSettings {
  /** Chosen from DIRECTION_CHOICES. */
  readonly directions: readonly number[]
  /** An even number of plies. */
  readonly maxPlies: number
}

export const DEFAULT_OPTIMISER_SETTINGS: OptimiserSettings = { directions: [0, 45, 90], maxPlies: DEFAULT_MAX_PLIES }

/** '0°', '±45°', '90°' */
export const directionLabel = (direction: number) => (direction === 0 || direction === 90 ? `${direction}°` : `±${direction}°`)

export function optimiseRequest(inputs: LaminateInputs, settings: OptimiserSettings): Result<OptimiseInput> {
  const material = plyMaterialOf(inputs.plies[0].materialId)
  if (!material) return fail('The top ply has no ply data: choose a UD or fabric ply material.')
  if (settings.directions.length === 0) return fail('Choose at least one ply direction.')
  const anglesDeg = DIRECTION_CHOICES.filter((d) => settings.directions.includes(d)).flatMap((d) => (d === 0 || d === 90 ? [d] : [d, -d]))
  return ok({
    material,
    loads: inputs.loads,
    criterion: inputs.criterion,
    anglesDeg,
    targetReserveFactor: inputs.targetReserveFactor,
    maxPlies: settings.maxPlies,
  })
}
