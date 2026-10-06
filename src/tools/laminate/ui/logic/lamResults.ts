// The screen's inputs handed to the laminate engine: ply materials looked up
// in the Materials Database, then the CLT analysis of the stack.
import { fail, ok, type Result } from '../../../../core/result'
import { analyseLaminate, PLY_MATERIALS, type LaminateAnalysis, type LaminateInput, type PlyMaterial } from '../../calc'
import type { LaminateInputs } from '../state/lamInputs'

/** The ply material with this id; readInputs only lets ply materials in. */
export function plyMaterialOf(materialId: string): PlyMaterial | null {
  return PLY_MATERIALS.find((m) => m.id === materialId) ?? null
}

export function laminateInput(inputs: LaminateInputs): Result<LaminateInput> {
  const plies = inputs.plies.map((ply) => {
    const material = plyMaterialOf(ply.materialId)
    return material && { material, angleDeg: ply.angleDeg }
  })
  if (plies.some((ply) => ply === null)) return fail('A ply material has no ply data: choose a UD or fabric ply material.')
  return ok({ plies: plies.filter((ply) => ply !== null), loads: inputs.loads, criterion: inputs.criterion, targetReserveFactor: inputs.targetReserveFactor })
}

export function analyse(inputs: LaminateInputs): Result<LaminateAnalysis> {
  const input = laminateInput(inputs)
  return input.ok ? analyseLaminate(input.value) : input
}
