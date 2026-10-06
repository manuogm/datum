// What the laminate report prints besides the drawings: the input facts, the
// warnings the result carries, and one row per ply at its critical face.
import type { ReportFact } from '../../../../app/report'
import { formatDecimal, formatQuantity, unitOf, type UnitSystem } from '../../../../core/units'
import { DEFAULT_TSAI_WU_F12_STAR, type LaminateAnalysis, type PlyResult } from '../../calc'
import type { LaminateInputs } from '../state/lamInputs'
import { angleText, CRITERION_LABELS, formatFactor, MODE_LABELS, modeText, plyMaterialName } from './labels'
import { LOAD_COMPONENTS } from './loads'
import { criticalText } from './verdict'

export function laminateFacts(inputs: LaminateInputs, { layup }: Pick<LaminateAnalysis, 'layup'>, system: UnitSystem): ReportFact[] {
  const applied = LOAD_COMPONENTS.filter((c) => inputs.loads[c.key] !== 0)
  const materials = [...new Set(inputs.plies.map((p) => p.materialId))].map(plyMaterialName)
  const criterion = inputs.criterion === 'tsai-wu'
    ? `${CRITERION_LABELS[inputs.criterion]}, F12* ${formatDecimal(DEFAULT_TSAI_WU_F12_STAR, 1)}`
    : CRITERION_LABELS[inputs.criterion]
  return [
    { label: 'Layup', value: layup.notation, mono: true },
    { label: 'Plies', value: `${layup.plyCount}, top ply first`, mono: true },
    { label: materials.length === 1 ? 'Material' : 'Materials', value: materials.join(', ') },
    { label: 'Thickness h', value: formatQuantity('length', system, layup.thicknessMm, { withUnit: true }), mono: true },
    { label: 'Areal mass', value: formatQuantity('arealMass', system, layup.arealMassKgPerM2, { withUnit: true }), mono: true },
    { label: 'Symmetric · balanced', value: `${layup.symmetric ? 'yes' : 'no'} · ${layup.balanced ? 'yes' : 'no'}`, warn: !layup.symmetric || !layup.balanced },
    ...(applied.length === 0
      ? [{ label: 'Loads', value: 'none', warn: true }]
      : applied.map((c) => ({ label: c.symbol, value: formatQuantity(c.quantity, system, inputs.loads[c.key], { withUnit: true }), mono: true }))),
    { label: 'Criterion', value: criterion },
    { label: 'Target RF', value: formatFactor(inputs.targetReserveFactor), mono: true },
  ]
}

export function laminateWarnings({ coupling, firstPlyFailure, plies, criterion }: Pick<LaminateAnalysis, 'coupling' | 'firstPlyFailure' | 'plies' | 'criterion'>): string[] {
  const { reserveFactor, targetReserveFactor, status, mode } = firstPlyFailure
  const warnings: string[] = []
  if (!Number.isFinite(reserveFactor)) warnings.push('No load is applied: first-ply failure is not checked.')
  else if (status === 'fail') {
    const verb = firstPlyFailure.criticalPlies.length === 1 ? 'fails' : 'fail'
    const how = criterion === 'tsai-wu' ? ` (${modeText(criterion, mode)})` : ` in ${MODE_LABELS[mode]}`
    warnings.push(`${criticalText({ firstPlyFailure, plies })} ${verb}${how} under the applied loads (RF ${formatFactor(reserveFactor)}).`)
  } else if (status === 'warn') warnings.push(`RF ${formatFactor(reserveFactor)} is below the target of ${formatFactor(targetReserveFactor)}.`)
  // The engine's coupling flags, read off the matrices (a stack can be unsymmetric and still have B = 0).
  if (coupling.bendingExtension) warnings.push('Bending–extension coupling (B ≠ 0): the laminate warps on cure and bends under in-plane load. Its engineering constants are apparent values.')
  if (coupling.shearExtension) warnings.push('Shear–extension coupling (A16, A26 ≠ 0): tension or compression shears the laminate.')
  return warnings
}

export interface PlyRow {
  readonly index: number
  readonly angle: string
  readonly material: string
  readonly thickness: string
  /** σ1, σ2, τ12 at the ply's critical face. */
  readonly stresses: readonly string[]
  readonly failureIndex: string
  readonly reserveFactor: string
  readonly mode: string
  readonly critical: boolean
}

export function plyRows({ plies, firstPlyFailure }: Pick<LaminateAnalysis, 'plies' | 'firstPlyFailure'>, system: UnitSystem): PlyRow[] {
  const face = (ply: PlyResult) => (ply.bottom.reserveFactor < ply.top.reserveFactor ? ply.bottom : ply.top)
  return plies.map((ply) => ({
    index: ply.index,
    angle: `${angleText(ply.angleDeg)}°`,
    material: ply.materialName,
    thickness: formatQuantity('length', system, ply.thicknessMm),
    stresses: face(ply).stressMaterialMPa.map((mpa) => formatQuantity('strength', system, mpa)),
    failureIndex: formatFactor(ply.failureIndex),
    reserveFactor: formatFactor(ply.reserveFactor),
    mode: MODE_LABELS[ply.mode],
    critical: firstPlyFailure.criticalPlies.includes(ply.index),
  }))
}

/** 'SI (mm, N/mm, N·mm/mm, MPa, GPa)' */
export const unitsLine = (system: UnitSystem) =>
  `${system === 'si' ? 'SI' : 'Imperial'} (${(['length', 'lineLoad', 'lineMoment', 'strength', 'modulus'] as const).map((q) => unitOf(q, system)).join(', ')})`
