import { fail, ok, type Result } from '../result'
import { MATERIALS } from './dataset'
import type { Material, MaterialFamily, MaterialProperty } from './material'
import { SOURCES, type MaterialSource } from './sources'

export function materialById(id: string): Result<Material> {
  const material = MATERIALS.find((m) => m.id === id)
  return material ? ok(material) : fail(`No material with id "${id}" in the materials database.`)
}

export function materialsInFamily(family: MaterialFamily): readonly Material[] {
  return MATERIALS.filter((m) => m.family === family)
}

/** Where a property value of a material comes from. */
export function sourceOf(material: Material, property: MaterialProperty | 'maxServiceTempC'): MaterialSource {
  if (property === 'maxServiceTempC') return SOURCES.judgement
  return SOURCES[material.sources.overrides?.[property] ?? material.sources.default]
}
