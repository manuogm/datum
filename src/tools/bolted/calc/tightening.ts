import { TIGHTENING_METHODS } from './rules'
import type { ThreadGeometry } from './threads'
import type { Tightening } from './types'

const N_MM_PER_N_M = 1000

/** αA (R1): from the method (VDI 2230-1 Table A8) or as given. */
export function tighteningFactor(tightening: Tightening): number {
  return 'method' in tightening ? TIGHTENING_METHODS[tightening.method].factor : tightening.tighteningFactor
}

/**
 * The bracket of the thread torque: P/(π·d2) + 1.155·µG, where 1.155 = 1/cos 30°
 * turns the thread friction µG into the friction on the 60° flank.
 */
function threadTorqueTerm(thread: ThreadGeometry, threadFriction: number): number {
  return thread.pitchMm / (Math.PI * thread.pitchDiameterMm) + 1.155 * threadFriction
}

/**
 * FMzul, the permissible assembly preload (VDI 2230-1 R7, eq. 5.5/1–2):
 * the preload at which the von Mises stress from tension and thread torsion
 * reaches ν·Rp0.2 in the stress cross-section As (d0 = ds):
 *   σM,zul = ν·Rp0.2 / √(1 + 3·[3/2 · d2/d0 · (P/(π·d2) + 1.155·µG,min)]²)
 *   FM,zul = σM,zul · A0
 * This is the formula behind the FM,Tab values of VDI 2230-1 Table A1.
 */
export function permissibleAssemblyPreloadN(thread: ThreadGeometry, proofStressMPa: number, utilisation: number, threadFriction: number): number {
  const torsionFactor = 1.5 * (thread.pitchDiameterMm / thread.stressDiameterMm) * threadTorqueTerm(thread, threadFriction)
  const permissibleStressMPa = (utilisation * proofStressMPa) / Math.sqrt(1 + 3 * torsionFactor ** 2)
  return permissibleStressMPa * thread.stressAreaMm2
}

/** MG, the thread torque at preload FM (VDI 2230-1 R8): MG = FM · d2/2 · (P/(π·d2) + 1.155·µG), N·mm. */
export function threadTorqueNmm(preloadN: number, thread: ThreadGeometry, threadFriction: number): number {
  return preloadN * (thread.pitchDiameterMm / 2) * threadTorqueTerm(thread, threadFriction)
}

/**
 * MA, the tightening torque (VDI 2230-1 R13):
 *   MA = FM,zul · (0.16·P + 0.58·d2·µG,min + DKm/2 · µK,min)
 * with DKm = (dW + dh)/2 the mean diameter of the head bearing face. In N·m.
 */
export function tighteningTorqueNm(
  preloadN: number, thread: ThreadGeometry, threadFriction: number, headFriction: number, bearingMeanDiameterMm: number,
): number {
  const leverMm = 0.16 * thread.pitchMm + 0.58 * thread.pitchDiameterMm * threadFriction + (bearingMeanDiameterMm / 2) * headFriction
  return (preloadN * leverMm) / N_MM_PER_N_M
}
