/**
 * Materials database: public API.
 *
 * Units are in the property names (…GPa, …MPa, …UmPerMK). Every value has a
 * source (sourceOf); see dataset.ts for values flagged as uncertain.
 */
export { MATERIALS } from './dataset'
export { materialById, materialsInFamily, sourceOf } from './lookup'
export {
  MATERIAL_FAMILIES,
  type FatigueStrength, type Material, type MaterialFamily, type MaterialProperty,
} from './material'
export { SOURCES, type MaterialSource, type SourceId, type SourceKind } from './sources'
