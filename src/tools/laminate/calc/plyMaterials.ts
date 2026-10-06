import { MATERIALS, type Material } from '../../../core/materials'
import { fail, ok, type Result } from '../../../core/result'
import type { PlyMaterial } from './types'

/** A database material as a ply material, or an explanation when it has no lamina data. */
export function plyMaterial(material: Material): Result<PlyMaterial> {
  const { lamina } = material
  return lamina ? ok({ ...material, lamina }) : fail(`"${material.name}" has no ply data (E1, E2, G12, ν12, strengths): choose a UD or fabric ply material.`)
}

/** The materials in the database that can be used as plies, in database order. */
export const PLY_MATERIALS: readonly PlyMaterial[] = MATERIALS.flatMap((material) => {
  const ply = plyMaterial(material)
  return ply.ok ? [ply.value] : []
})
