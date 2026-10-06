import { fail, ok, type Result } from '../../../core/result'
import { couplingOf, engineeringConstants, laminateStiffness, plyBoundariesMm, type PlySection } from './abd'
import { reducedStiffnessMPa, transformedStiffnessMPa } from './lamina'
import { formatLayup, isBalanced, isSymmetric, plyThicknessMm } from './layup'
import { midplaneResponse, pointResponse } from './response'
import { CRITICAL_PLY_TOLERANCE, DEFAULT_TARGET_RESERVE_FACTOR, DEFAULT_TSAI_WU_F12_STAR, reserveStatus } from './rules'
import type { FirstPlyFailure, LaminateAnalysis, LaminateInput, LaminateLoads, LayupSummary, Ply, PlyResult } from './types'
import { inputError } from './validate'

/** Loads with omitted values set to 0. */
export function loadsWithDefaults(loads: LaminateLoads): Required<LaminateLoads> {
  return {
    nxNPerMm: loads.nxNPerMm ?? 0, nyNPerMm: loads.nyNPerMm ?? 0, nxyNPerMm: loads.nxyNPerMm ?? 0,
    mxN: loads.mxN ?? 0, myN: loads.myN ?? 0, mxyN: loads.mxyN ?? 0,
  }
}

/** Areal mass Σ ρ·t: g/cm³ × mm = kg/m². */
const arealMassKgPerM2 = (plies: readonly Ply[]) => plies.reduce((sum, ply) => sum + ply.material.densityGPerCm3 * plyThicknessMm(ply), 0)

function layupSummary(plies: readonly Ply[]): LayupSummary {
  return {
    notation: formatLayup(plies.map((ply) => ply.angleDeg)),
    plyCount: plies.length,
    thicknessMm: plies.reduce((sum, ply) => sum + plyThicknessMm(ply), 0),
    arealMassKgPerM2: arealMassKgPerM2(plies),
    symmetric: isSymmetric(plies),
    balanced: isBalanced(plies),
  }
}

/**
 * First-ply failure (FPF): in linear CLT every stress scales with the loads,
 * so the lowest ply reserve factor is the load factor at which the first ply
 * fails, and FPF loads = RF × applied loads (Daniel & Ishai §8.10).
 */
function firstPlyFailure(plies: readonly PlyResult[], loads: Required<LaminateLoads>, targetReserveFactor: number): FirstPlyFailure {
  const reserveFactor = Math.min(...plies.map((ply) => ply.reserveFactor))
  const critical = Number.isFinite(reserveFactor)
    ? plies.filter((ply) => ply.reserveFactor <= reserveFactor * (1 + CRITICAL_PLY_TOLERANCE)) : []
  const scaled = (value: number) => (value === 0 ? 0 : value * reserveFactor)
  return {
    reserveFactor,
    criticalPlies: critical.map((ply) => ply.index),
    mode: critical[0]?.mode ?? 'none',
    loads: {
      nxNPerMm: scaled(loads.nxNPerMm), nyNPerMm: scaled(loads.nyNPerMm), nxyNPerMm: scaled(loads.nxyNPerMm),
      mxN: scaled(loads.mxN), myN: scaled(loads.myN), mxyN: scaled(loads.mxyN),
    },
    targetReserveFactor,
    status: reserveStatus(reserveFactor, targetReserveFactor),
  }
}

/**
 * Classical laminate theory analysis of a laminate under running loads N and
 * moments M: ABD stiffness, couplings, engineering constants, ply strains and
 * stresses at the top and bottom of every ply, ply reserve factors by the
 * chosen criterion and the first-ply failure load. Returns an explanation
 * instead of a result when the input is not usable; never throws.
 *
 * Assumptions (Jones §4.2): plane stress in every ply, perfectly bonded plies,
 * straight normals (Kirchhoff), linear elastic plies up to first-ply failure.
 * Not modelled: thermal and moisture residual stresses, interlaminar and
 * free-edge stresses, progressive (post-FPF) failure.
 */
export function analyseLaminate(input: LaminateInput): Result<LaminateAnalysis> {
  const invalid = inputError(input)
  if (invalid) return fail(invalid)
  const f12Star = input.tsaiWuF12Star ?? DEFAULT_TSAI_WU_F12_STAR
  const layup = layupSummary(input.plies)
  const faces = plyBoundariesMm(input.plies.map(plyThicknessMm))
  const sections = input.plies.map((ply, i): PlySection & { readonly qMPa: PlySection['qBarMPa'] } => {
    const qMPa = reducedStiffnessMPa(ply.material.lamina)
    return { qMPa, qBarMPa: transformedStiffnessMPa(qMPa, ply.angleDeg), ...faces[i] }
  })
  const stiffness = laminateStiffness(sections)
  if (!stiffness.ok) return stiffness
  const coupling = couplingOf(stiffness.value, layup.thicknessMm)
  const loads = loadsWithDefaults(input.loads)
  const { strain, curvaturePerMm } = midplaneResponse(stiffness.value.compliance,
    [loads.nxNPerMm, loads.nyNPerMm, loads.nxyNPerMm], [loads.mxN, loads.myN, loads.mxyN])
  const plies = input.plies.map((ply, i): PlyResult => {
    const context = { ...sections[i], angleDeg: ply.angleDeg, lamina: ply.material.lamina, criterion: input.criterion, f12Star }
    const top = pointResponse(sections[i].zTopMm, strain, curvaturePerMm, context)
    const bottom = pointResponse(sections[i].zBottomMm, strain, curvaturePerMm, context)
    const worst = bottom.reserveFactor < top.reserveFactor ? bottom : top
    return {
      index: i + 1, angleDeg: ply.angleDeg, materialName: ply.material.name, thicknessMm: plyThicknessMm(ply),
      top, bottom, reserveFactor: worst.reserveFactor, failureIndex: worst.failureIndex, mode: worst.mode,
    }
  })
  return ok({
    layup,
    stiffness: stiffness.value,
    coupling,
    constants: engineeringConstants(stiffness.value, layup.thicknessMm, coupling.bendingExtension),
    midplaneStrain: strain,
    curvaturePerMm,
    plies,
    firstPlyFailure: firstPlyFailure(plies, loads, input.targetReserveFactor ?? DEFAULT_TARGET_RESERVE_FACTOR),
    criterion: input.criterion,
  })
}
