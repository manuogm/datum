import type { LaminaProperties } from '../../../core/materials'
import { MAX_PLIES } from './rules'
import type { LaminateInput, LaminateLoads } from './types'

/**
 * Checks a laminate input before any calculation. Returns a plain-English
 * explanation of the first problem found, or null when the input is usable.
 */
export function inputError(input: LaminateInput): string | null {
  return pliesError(input) ?? loadsError(input.loads) ?? settingsError(input)
}

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const isPositive = (value: unknown) => isFiniteNumber(value) && value > 0

/**
 * The ply data must give a positive-definite stiffness matrix: positive
 * moduli and ν12² < E1/E2, i.e. ν12·ν21 < 1 (Jones §2.4.1, restrictions on
 * the elastic constants).
 */
export function laminaError(lamina: LaminaProperties, name: string): string | null {
  const { e1GPa, e2GPa, g12GPa, nu12, xtMPa, xcMPa, ytMPa, ycMPa, sMPa, plyThicknessMm } = lamina
  if (![e1GPa, e2GPa, g12GPa].every(isPositive)) return `"${name}" needs ply moduli E1, E2 and G12 above zero.`
  if (!(isFiniteNumber(nu12) && nu12 >= 0 && nu12 ** 2 < e1GPa / e2GPa)) return `The Poisson's ratio ν12 of "${name}" must be at least 0 and below √(E1/E2).`
  if (![xtMPa, xcMPa, ytMPa, ycMPa, sMPa].every(isPositive)) return `"${name}" needs strengths Xt, Xc, Yt, Yc and S above zero.`
  if (!isPositive(plyThicknessMm)) return `"${name}" needs a ply thickness above zero.`
  return null
}

function pliesError({ plies }: LaminateInput): string | null {
  if (plies.length === 0) return 'Add at least one ply.'
  if (plies.length > MAX_PLIES) return `A laminate can have at most ${MAX_PLIES} plies.`
  for (const [index, ply] of plies.entries()) {
    if (!ply.material?.lamina) return `Ply ${index + 1} needs a ply material with lamina data (E1, E2, G12, ν12 and strengths).`
    const error = laminaError(ply.material.lamina, ply.material.name)
    if (error) return error
    if (!isFiniteNumber(ply.angleDeg)) return `Ply ${index + 1} needs a fibre angle.`
    if (ply.thicknessMm !== undefined && !isPositive(ply.thicknessMm)) return `Ply ${index + 1} needs a thickness above zero.`
  }
  return null
}

function loadsError(loads: LaminateLoads): string | null {
  const values = [loads.nxNPerMm, loads.nyNPerMm, loads.nxyNPerMm, loads.mxN, loads.myN, loads.mxyN]
  return values.every((value) => value === undefined || isFiniteNumber(value)) ? null : 'Every load must be a number (or left empty for 0).'
}

function settingsError(input: LaminateInput): string | null {
  if (input.criterion !== 'max-stress' && input.criterion !== 'tsai-hill' && input.criterion !== 'tsai-wu') {
    return 'Choose a failure criterion: maximum stress, Tsai-Hill or Tsai-Wu.'
  }
  if (input.targetReserveFactor !== undefined && !isPositive(input.targetReserveFactor)) return 'The target reserve factor must be above zero.'
  if (input.tsaiWuF12Star !== undefined && !(isFiniteNumber(input.tsaiWuF12Star) && Math.abs(input.tsaiWuF12Star) < 1)) {
    return 'The Tsai-Wu interaction coefficient F12* must lie between −1 and 1 (exclusive), or the failure surface is not closed.'
  }
  return null
}
