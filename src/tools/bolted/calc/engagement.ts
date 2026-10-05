import type { BoltMaterial } from './propertyClasses'
import { BOLT_SHEAR_STRENGTH_RATIO, SHEAR_STRENGTH_RATIO } from './rules'
import { boltStrippingAreaPerMm, internalStrippingAreaPerMm, strippingLengthMm } from './strength'
import type { ThreadGeometry } from './threads'
import type { JointMaterial, JointType, ThreadSize } from './types'

/** Minimum length of engagement for tapped threads and thread inserts (VDI 2230-1:2015 R11, simplified). */

export interface ThreadEngagement {
  readonly actualMm: number
  /** meff,min: the bolt breaks before any thread strips. */
  readonly requiredMm: number
  /** The thread that needs the longest engagement. */
  readonly governing: 'bolt thread' | 'tapped thread' | 'insert outer thread'
  /** The thread the insert makes in the parent part (inserts only). */
  readonly outerThread: Required<ThreadSize> | null
}

/** τB of a tapped part: τB/Rm (rules.ts) × Rm. null when not known (composites, polymers, no Rm). */
export function parentShearStrengthMPa(material: JointMaterial): number | null {
  const ratio = SHEAR_STRENGTH_RATIO[material.family]
  return ratio === null || material.tensileStrengthMPa === null ? null : ratio * material.tensileStrengthMPa
}

/**
 * The STI thread tapped for a helical-coil insert: the bolt thread moved
 * outwards by the wire's radial thickness 0.649519·P on each side, so
 * D(STI) = d + 1.299038·P at the same pitch (as in NASM 33537 / DIN 8140 tables).
 * UNSURE: recalled from the insert makers' tables, which round slightly differently.
 */
export function stiThread(thread: ThreadGeometry): Required<ThreadSize> {
  return { nominalMm: thread.nominalMm + 2 * 0.649519 * thread.pitchMm, pitchMm: thread.pitchMm }
}

/**
 * meff,min against the bolt's breaking force FmS = Rm·As:
 * - tapped: bolt thread and tapped thread, each over the engagement length;
 * - insert: bolt thread inside the insert (the steel insert itself is taken
 *   to be stronger than the bolt thread) and the insert's outer thread in the parent.
 * Returns null for a through-bolt: an ISO 4032 nut of the matching property
 * class (ISO 898-2) is designed so that the bolt breaks before the threads strip.
 * Also null when the parent's shear strength is not known (input validation
 * rejects such joints).
 */
export function threadEngagement(joint: JointType, thread: ThreadGeometry, bolt: BoltMaterial): ThreadEngagement | null {
  if (joint.kind === 'through-bolt') return null
  const parentShearMPa = parentShearStrengthMPa(joint.material)
  if (parentShearMPa === null) return null
  const breakingForceN = bolt.tensileStrengthMPa * thread.stressAreaMm2
  const boltShearMPa = bolt.tensileStrengthMPa * (bolt.stainless ? BOLT_SHEAR_STRENGTH_RATIO.stainless : BOLT_SHEAR_STRENGTH_RATIO.steel)
  const boltThreadMm = strippingLengthMm(breakingForceN, boltShearMPa, boltStrippingAreaPerMm(thread))
  const outerThread = joint.kind === 'insert' ? joint.outerThread ?? stiThread(thread) : null
  const parentMm = strippingLengthMm(breakingForceN, parentShearMPa, internalStrippingAreaPerMm(outerThread?.nominalMm ?? thread.nominalMm))
  const parentGoverns = parentMm >= boltThreadMm
  return {
    actualMm: joint.engagementMm,
    requiredMm: Math.max(parentMm, boltThreadMm),
    governing: !parentGoverns ? 'bolt thread' : outerThread ? 'insert outer thread' : 'tapped thread',
    outerThread,
  }
}
