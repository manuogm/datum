import { fail, ok, type Result } from '../../../core/result'
import {
  analyseLaminate, DEFAULT_TARGET_RESERVE_FACTOR, formatLayup, laminateInputError, loadsWithDefaults, MAX_PLIES, normaliseAngleDeg, pliesOf,
} from '../calc'
import { DEFAULT_ANGLES_DEG, DEFAULT_MAX_PLIES, DESIGN_RULES, MAX_CONSECUTIVE_PLIES, MAX_SEQUENCES_PER_PLY_COUNT, MIN_SHARE_PERCENT } from './rules'
import type { LayupCandidate, LayupOptimisation, OptimiseInput } from './types'

/**
 * Stacking-sequence search by plain enumeration: every laminate the design
 * rules allow (rules.ts) is built and analysed with analyseLaminate, from the
 * fewest plies upwards, and the search stops at the first ply count where a
 * laminate reaches the target reserve factor. Nothing is random, so the same
 * input always gives the same answer.
 *
 * Only half the stack is built (top ply to mid-plane) and mirrored, which
 * makes every laminate symmetric. Without moments a symmetric laminate has
 * B = 0 and κ = 0, so every ply sees the same strain and its stresses depend
 * on its angle only: the reserve factor depends on the ply mix, not on the
 * order, and one rule-compliant order per mix is analysed. With moments the
 * order matters and every compliant order is analysed, up to
 * MAX_SEQUENCES_PER_PLY_COUNT shared equally among the ply mixes.
 */

const CANDIDATES_SHOWN = 10

/** Plies in one direction: 0°, 90°, or a ±θ pair whose two signs always have the same count (balance). */
type Family = readonly number[]

const degrees = (angle: number) => `${angle < 0 ? '−' : ''}${Math.abs(angle)}°`

/** The angle set, normalised and without repeats, grouped into families; an error if a ±θ pair is incomplete. */
function familiesOf(anglesDeg: readonly number[]): Result<{ readonly angles: readonly number[]; readonly families: readonly Family[] }> {
  if (anglesDeg.length === 0 || !anglesDeg.every(Number.isFinite)) return fail('Give the ply angles the laminate may use, for example 0, ±45, 90.')
  const angles = [...new Set(anglesDeg.map(normaliseAngleDeg))]
  const families: Family[] = []
  for (const angle of angles) {
    if (angle === 0 || angle === 90) families.push([angle])
    else if (!angles.includes(-angle)) return fail(`The angle set has ${degrees(angle)} but not ${degrees(-angle)}: a balanced laminate needs both.`)
    else if (angle > 0) families.push([angle, -angle])
  }
  return ok({ angles, families })
}

/** Ply counts per angle in half the laminate. */
type PlyMix = ReadonlyMap<number, number>

/**
 * Every ply mix of `halfCount` plies with each angle at least `minimum`
 * times and both signs of a ±θ pair equally often, in a fixed order.
 */
function* plyMixes(families: readonly Family[], halfCount: number, minimum: number, chosen: PlyMix = new Map()): Generator<PlyMix> {
  const [family, ...rest] = families
  if (!family) {
    if (halfCount === 0) yield chosen
    return
  }
  for (let count = minimum; count * family.length <= halfCount; count++) {
    const next = new Map(chosen)
    for (const angle of family) next.set(angle, count)
    yield* plyMixes(rest, halfCount - count * family.length, minimum, next)
  }
}

/**
 * Every order of a ply mix, top ply first, that keeps runs of one angle to
 * MAX_CONSECUTIVE_PLIES, counts the run at the mid-plane twice (it meets its
 * mirror image) and starts with one of `outerAngles` (any angle when empty).
 */
function* halfSequences(mix: PlyMix, angles: readonly number[], outerAngles: readonly number[], prefix: readonly number[] = []): Generator<readonly number[]> {
  const remaining = angles.filter((angle) => (mix.get(angle) ?? 0) > 0)
  const last = prefix[prefix.length - 1]
  const run = last === undefined ? 0 : prefix.length - 1 - prefix.findLastIndex((angle) => angle !== last)
  if (remaining.length === 0) {
    if (2 * run <= MAX_CONSECUTIVE_PLIES) yield prefix
    return
  }
  const left = [...mix.values()].reduce((sum, count) => sum + count, 0)
  // Prune: an angle with n plies left needs at least ⌈n / MAX⌉ − 1 other plies to separate its runs.
  if (remaining.some((angle) => (mix.get(angle) ?? 0) > MAX_CONSECUTIVE_PLIES * (left - (mix.get(angle) ?? 0) + 1))) return
  for (const angle of remaining) {
    if (prefix.length === 0 && outerAngles.length > 0 && !outerAngles.includes(angle)) continue
    if (angle === last && run === MAX_CONSECUTIVE_PLIES) continue
    yield* halfSequences(new Map(mix).set(angle, (mix.get(angle) ?? 0) - 1), angles, outerAngles, [...prefix, angle])
  }
}

function candidateOf(input: OptimiseInput, half: readonly number[]): Result<LayupCandidate> {
  const anglesDeg = [...half, ...[...half].reverse()]
  const analysis = analyseLaminate({
    plies: pliesOf(input.material, anglesDeg), loads: input.loads, criterion: input.criterion,
    targetReserveFactor: input.targetReserveFactor, tsaiWuF12Star: input.tsaiWuF12Star,
  })
  if (!analysis.ok) return analysis
  const { layup, firstPlyFailure } = analysis.value
  return ok({
    anglesDeg, notation: formatLayup(anglesDeg), plyCount: layup.plyCount, thicknessMm: layup.thicknessMm,
    arealMassKgPerM2: layup.arealMassKgPerM2, reserveFactor: firstPlyFailure.reserveFactor, criticalPlies: firstPlyFailure.criticalPlies,
  })
}

function maxPliesError(maxPlies: number): string | null {
  return Number.isInteger(maxPlies) && maxPlies >= 2 && maxPlies <= MAX_PLIES && maxPlies % 2 === 0
    ? null : `The largest laminate to search must be an even number of plies from 2 to ${MAX_PLIES}.`
}

/**
 * The lightest symmetric, balanced laminate of one ply material that meets
 * the design rules and reaches the target reserve factor under the loads.
 * Returns an explanation instead of a result when the input is not usable.
 */
export function optimiseLayup(input: OptimiseInput): Result<LayupOptimisation> {
  const set = familiesOf(input.anglesDeg ?? DEFAULT_ANGLES_DEG)
  if (!set.ok) return set
  const maxPlies = input.maxPlies ?? DEFAULT_MAX_PLIES
  const invalid = maxPliesError(maxPlies) ?? laminateInputError({
    plies: pliesOf(input.material, set.value.angles), loads: input.loads, criterion: input.criterion,
    targetReserveFactor: input.targetReserveFactor, tsaiWuF12Star: input.tsaiWuF12Star,
  })
  if (invalid) return fail(invalid)

  const { angles, families } = set.value
  const loads = loadsWithDefaults(input.loads)
  const orderMatters = loads.mxN !== 0 || loads.myN !== 0 || loads.mxyN !== 0
  const outerAngles = angles.includes(45) ? [45, -45] : []
  const targetReserveFactor = input.targetReserveFactor ?? DEFAULT_TARGET_RESERVE_FACTOR
  let ranked: LayupCandidate[] = []
  let smallestPlyCount = 0
  let sequencesAnalysed = 0
  let exhaustive = true

  for (let halfCount = 1; halfCount <= maxPlies / 2; halfCount++) {
    // Each angle ≥ 10 % of 2·halfCount plies ⇔ ≥ halfCount/10 plies in the half (integer arithmetic, no round-off).
    const minimum = Math.max(1, Math.ceil((halfCount * MIN_SHARE_PERCENT) / 100))
    const mixes = [...plyMixes(families, halfCount, minimum)]
    // Without moments one order per mix; with moments the cap is shared equally, so every mix is tried.
    const ordersPerMix = orderMatters ? Math.max(1, Math.floor(MAX_SEQUENCES_PER_PLY_COUNT / mixes.length)) : 1
    const candidates: LayupCandidate[] = []
    for (const mix of mixes) {
      let orders = 0
      for (const half of halfSequences(mix, angles, outerAngles)) {
        if (orders === ordersPerMix) {
          exhaustive &&= !orderMatters
          break
        }
        const candidate = candidateOf(input, half)
        if (!candidate.ok) return candidate
        candidates.push(candidate.value)
        orders++
      }
    }
    if (candidates.length === 0) continue
    sequencesAnalysed += candidates.length
    smallestPlyCount ||= 2 * halfCount
    ranked = candidates.sort((a, b) => b.reserveFactor - a.reserveFactor) // stable: ties keep enumeration order
    if (ranked[0].reserveFactor >= targetReserveFactor) break
  }
  if (ranked.length === 0) return fail(`No laminate of up to ${maxPlies} plies meets the design rules with these angles: allow more plies.`)
  const best = ranked[0].reserveFactor >= targetReserveFactor ? ranked[0] : null
  return ok({
    best,
    candidates: ranked.slice(0, CANDIDATES_SHOWN),
    targetReserveFactor,
    rules: DESIGN_RULES,
    search: { plyCounts: [smallestPlyCount, ranked[0].plyCount], maxPlies, sequencesAnalysed, exhaustive, orderMatters },
  })
}
