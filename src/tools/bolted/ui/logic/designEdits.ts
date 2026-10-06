// Edits of a joint design that change more than the field touched: a new
// nominal diameter takes its coarse pitch, a new joint kind keeps the part
// material, and an insert's outer thread is typed as a thread designation.
// Also the inputs a design cannot be checked without.
import { materialById } from '../../../../core/materials'
import { LIMITING_SURFACE_PRESSURE_MPA, pitchesForMm, type InsertType, type ThreadSize } from '../../calc'
import type { JointDesignSpec, JointKindSpec, PlateSpec } from '../state/boltInputs'

/** Thread engagement offered for a new tapped joint or insert: 1.5·d, a usual starting point. */
const STARTING_ENGAGEMENT = 1.5

export function threadOfNominal(nominalMm: number): Required<ThreadSize> {
  return { nominalMm, pitchMm: pitchesForMm(nominalMm)[0] ?? 1 }
}

/** The joint as another kind, keeping its part material and engagement where it has them. */
export function jointOfKind(design: JointDesignSpec, kind: JointKindSpec['kind'], insert: InsertType = 'helical-coil'): JointKindSpec {
  const current = design.joint
  if (kind === 'through-bolt') return { kind }
  const materialId = current.kind === 'through-bolt' ? design.plates[design.plates.length - 1].materialId : current.materialId
  const engagementMm = current.kind === 'through-bolt' ? STARTING_ENGAGEMENT * design.thread.nominalMm : current.engagementMm
  if (kind === 'tapped') return { kind, materialId, engagementMm }
  // The outer thread comes from the insert catalogue; it is never guessed.
  return { kind, insert, materialId, engagementMm, outerThread: null }
}

const DESIGNATION = /^\s*M?\s*(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*$/i

/** 'M6×1', 'm6x1' or '6 x 1' as a thread; null for anything else. */
export function parseThread(text: string): Required<ThreadSize> | null {
  const match = DESIGNATION.exec(text)
  if (!match) return null
  const [nominalMm, pitchMm] = [match[1], match[2]].map((n) => Number(n.replace(',', '.')))
  return nominalMm > 0 && pitchMm > 0 ? { nominalMm, pitchMm } : null
}

/** Always with the pitch: 'M6×1'. */
export function threadDesignation(thread: Required<ThreadSize>): string {
  return `M${thread.nominalMm}×${thread.pitchMm}`
}

/** A key-locking insert cannot be checked until its catalogue outer thread is entered. */
export function needsOuterThread({ joint }: JointDesignSpec): boolean {
  return joint.kind === 'insert' && joint.insert === 'key-locking' && joint.outerThread === null
}

/** A polymer or composite part creeps, so its pG is not estimated: unless tabulated it must be entered. */
export function needsLimitingPressure(materialId: string): boolean {
  const material = materialById(materialId)
  if (!material.ok || LIMITING_SURFACE_PRESSURE_MPA[materialId] !== undefined) return false
  return material.value.family === 'polymer' || material.value.family === 'composite'
}

/** The plate with pG entered, or without it (back to the table value or estimate) when cleared. */
export function withLimitingPressure(plate: PlateSpec, limitingPressureMPa: number | undefined): PlateSpec {
  const base = { materialId: plate.materialId, thicknessMm: plate.thicknessMm }
  return limitingPressureMPa === undefined ? base : { ...base, limitingPressureMPa }
}
