// Words for the engine's choices, and the short names of a joint ("M12 10.9
// steel", "Insert in Al 7075-T6") used in lists, the plan legend and the
// engine's own messages.
import type { MarkerColor, SegmentOption } from '../../../../app/ui'
import { materialById, type MaterialFamily } from '../../../../core/materials'
import {
  pitchesForMm, type HeadType, type InsertType, type JointType, type LoadIntroductionPosition,
  type StepStatus, type SurfaceRoughness, type ThreadSize, type TighteningMethod,
} from '../../calc'
import type { BoltMode, JointDesignSpec, JointKindSpec } from '../state/boltInputs'

/** The modes, chosen on the first step. */
export const BOLT_MODES: readonly SegmentOption<BoltMode>[] = [
  { value: 'joint', label: 'Single joint' },
  { value: 'pattern', label: 'Bolt pattern' },
]

export const HEAD_LABELS: Record<HeadType, string> = { hex: 'Hexagon', socket: 'Socket head' }

export const JOINT_KIND_LABELS: Record<JointType['kind'], string> = {
  'through-bolt': 'Through-bolt',
  tapped: 'Tapped',
  insert: 'Insert',
}

/** The insert types by the trade names engineers use for them. */
export const INSERT_LABELS: Record<InsertType, string> = { 'helical-coil': 'Helicoil', 'key-locking': 'Keensert' }

export const TIGHTENING_LABELS: Record<TighteningMethod, string> = {
  'torque-wrench': 'Torque wrench',
  'torque-wrench-calibrated': 'Torque wrench, calibrated on the joint',
  'impact-wrench': 'Impact wrench',
}

export const ROUGHNESS_LABELS: Record<SurfaceRoughness, string> = {
  'rz-below-10': 'Rz < 10 µm',
  'rz-10-to-40': 'Rz 10 … 40 µm',
  'rz-40-to-160': 'Rz 40 … 160 µm',
}

export const LOAD_INTRODUCTION_LABELS: Record<LoadIntroductionPosition, string> = {
  'near-head': 'Near the head',
  middle: 'Mid-way',
  'near-interface': 'Near the interface',
}

/** The dot of a calculation step by its status; a step that only calculates is faint. */
export const STEP_MARKER: Record<StepStatus, MarkerColor> = { pass: 'ok', warn: 'warn', fail: 'bad', info: 'faint' }

/** Select options from a label table, in its order. */
export const optionsOf = <T extends string>(labels: Record<T, string>) => (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }))

/** 'M10' for the coarse pitch, 'M10×1.25' for a fine one. */
export function threadLabel(thread: Required<ThreadSize>): string {
  return pitchesForMm(thread.nominalMm)[0] === thread.pitchMm ? `M${thread.nominalMm}` : `M${thread.nominalMm}×${thread.pitchMm}`
}

export function materialName(id: string): string {
  const material = materialById(id)
  return material.ok ? material.value.name : id
}

/** The family a material is drawn in; steel for an id the database does not know. */
export function materialFamily(id: string): MaterialFamily {
  const material = materialById(id)
  return material.ok ? material.value.family : 'steel'
}

const isStainless = (design: JointDesignSpec) => design.propertyClass.startsWith('A')

/** 'M12 10.9 steel', 'M6 A4-80 stainless', 'M4 12.9 + Helicoil'. */
export function jointTitle(design: JointDesignSpec): string {
  const bolt = `${threadLabel(design.thread)} ${design.propertyClass}`
  if (design.joint.kind === 'insert') return `${bolt} + ${INSERT_LABELS[design.joint.insert]}`
  return `${bolt} ${isStainless(design) ? 'stainless' : 'steel'}`
}

/** 'Through, nut · Ti-6Al-4V Grade 5', 'Tapped Ti-6Al-4V Grade 5', 'Key-locked insert in Al 7075-T6'. */
export function jointDetail(design: JointDesignSpec): string {
  return jointKindDetail(design.joint, design.plates[0]?.materialId)
}

function jointKindDetail(joint: JointKindSpec, firstPlateId: string | undefined): string {
  switch (joint.kind) {
    case 'through-bolt':
      return firstPlateId ? `Through, nut · ${materialName(firstPlateId)}` : 'Through, nut'
    case 'tapped':
      return `Tapped ${materialName(joint.materialId)}`
    case 'insert':
      return `${joint.insert === 'key-locking' ? 'Key-locked insert' : 'Insert'} in ${materialName(joint.materialId)}`
  }
}

/** How a joint type is drawn in the plan and the joint type list. */
export type JointSymbolKind = 'through-bolt' | 'tapped' | InsertType

export function jointSymbolKind({ joint }: JointDesignSpec): JointSymbolKind {
  return joint.kind === 'insert' ? joint.insert : joint.kind
}
