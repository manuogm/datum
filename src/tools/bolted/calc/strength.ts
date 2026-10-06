import { TORSION_REDUCTION } from './rules'
import type { ThreadGeometry } from './threads'
import type { ThreadRolling } from './types'

/** Working-state strength formulas of VDI 2230-1:2015 §5.5 (steps R8 … R12). */

const N_MM_PER_N_M = 1000

export interface WorkingStress {
  /** σz,max = FSmax / As. */
  readonly axialMPa: number
  /** kτ·τmax with τmax = MG / WP, WP = π·d0³/16. */
  readonly torsionMPa: number
  /** σred,B = √(σz² + 3·(kτ·τ)²). */
  readonly reducedMPa: number
}

/** R8: equivalent stress in the bolt under the largest working load. */
export function workingStress(boltForceMaxN: number, threadTorqueNmm: number, thread: ThreadGeometry): WorkingStress {
  const axialMPa = boltForceMaxN / thread.stressAreaMm2
  const polarModulusMm3 = (Math.PI / 16) * thread.stressDiameterMm ** 3
  const torsionMPa = TORSION_REDUCTION * threadTorqueNmm / polarModulusMm3
  return { axialMPa, torsionMPa, reducedMPa: Math.sqrt(axialMPa ** 2 + 3 * torsionMPa ** 2) }
}

/**
 * R9: alternating stress in the thread, σa = Φn·(FA,max − FA,min) / (2·As)
 * (concentric loading, no bending).
 */
export function alternatingStressMPa(loadFactor: number, axialMaxN: number, axialMinN: number, thread: ThreadGeometry): number {
  return loadFactor * (axialMaxN - axialMinN) / (2 * thread.stressAreaMm2)
}

/**
 * R9: endurance limit of the thread (stress amplitude, beyond about 2·10⁶ cycles):
 * - rolled before heat treatment: σASV = 0.85·(150/d + 45) MPa;
 * - rolled after heat treatment:  σASG = (2 − FSm/F0.2min)·σASV, with the
 *   ratio FSm/F0.2min of mean bolt force to minimum yield force kept within
 *   its range of validity 0.3 … 1.
 * Valid for d ≤ 40 mm and bolts to ISO 898-1.
 */
export function fatigueLimitMPa(nominalMm: number, rolling: ThreadRolling, meanBoltForceN: number, yieldForceN: number): number {
  const rolledBeforeMPa = 0.85 * (150 / nominalMm + 45)
  if (rolling === 'before-heat-treatment') return rolledBeforeMPa
  const ratio = Math.min(1, Math.max(0.3, meanBoltForceN / yieldForceN))
  return (2 - ratio) * rolledBeforeMPa
}

/**
 * R11: engagement length at which the internal thread strips at the same
 * force as the bolt breaks (FmS = Rm·As), from the stripping area per unit
 * length of engagement, with the ISO 68-1 basic profile:
 * - internal thread, sheared at the bolt major diameter d:
 *   ASGM/meff = π·d·[P/2 + (d − D2)·tan 30°]/P = 0.875·π·d
 * - bolt thread, sheared at the internal-thread minor diameter D1:
 *   ASGS/meff = π·D1·[P/2 + (d2 − D1)·tan 30°]/P = 0.75·π·D1
 * meff,min = FmS / (τB · ASG/meff).
 * Simplified from VDI 2230-1 §5.5.5: basic profile without tolerances and
 * the strength reduction factors C1 (nut dilation) and C3 (thread bending)
 * taken as 1, so it can understate meff,min by up to about 20 %.
 */
export function strippingLengthMm(breakingForceN: number, shearStrengthMPa: number, strippingAreaPerMm: number): number {
  return breakingForceN / (shearStrengthMPa * strippingAreaPerMm)
}

/** ASGM/meff of an internal thread with major diameter d (basic profile): 0.875·π·d. */
export function internalStrippingAreaPerMm(majorDiameterMm: number): number {
  return 0.875 * Math.PI * majorDiameterMm
}

/** ASGS/meff of the bolt thread inside an internal thread of minor diameter D1: 0.75·π·D1. */
export function boltStrippingAreaPerMm(thread: ThreadGeometry): number {
  return 0.75 * Math.PI * thread.nutMinorDiameterMm
}

/**
 * R12 (with R2): clamp load needed so that neither the transverse force FQ
 * nor the torque MY about the bolt axis makes the parts slip:
 *   FKQerf = FQ / (qF·µT) + MY / (qF·ra·µT)
 */
export function slipClampForceN(transverseN: number, torqueNm: number, interfaces: number, frictionRadiusMm: number, interfaceFriction: number): number {
  return (transverseN + (torqueNm * N_MM_PER_N_M) / frictionRadiusMm) / (interfaces * interfaceFriction)
}
