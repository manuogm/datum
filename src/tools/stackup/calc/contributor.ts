import { datumFrameText, datumShiftDeviations, frameDatumShift, geometricDeviations } from './geometric'
import { SIGMAS_PER_HALF_BAND } from './rules'
import { SOURCE } from './sources'
import type {
  Contributor, ContributorResult, Conversion, DatumShiftContributor, DrawingStandard, GeometricBreakdown, PlainTolerance, StackResult,
} from './types'

/** A contributor centred on its mean, before the shares of the stack are known. */
export type CentredContributor = Omit<ContributorResult, 'worstCasePercent' | 'rssPercent'>

const conversionOf = (rule: string, source: string): Conversion => ({ rule, source, appliesWhen: null, unsure: null, modifiers: [] })

/**
 * Unequal tolerances are stacked as mean ± half band: a dimension
 * nominal +u/+l (signed deviations, u ≥ l) has the same limits as
 * (nominal + (u + l)/2) ± (u − l)/2. Stacking the means and the equal
 * half bands gives the same worst-case limits as stacking the limits, and
 * is what RSS needs, since it assumes each dimension centred in its band
 * (Drake ch. 9; Fortini).
 */
function plainDeviations(nominal: number, tolerance: PlainTolerance): { readonly upper: number; readonly lower: number; readonly conversion: Conversion } {
  const source = `${SOURCE.drakeStacks}; ${SOURCE.fortini}`
  switch (tolerance.kind) {
    case 'symmetric':
      return { upper: tolerance.plusMinus, lower: -tolerance.plusMinus, conversion: conversionOf('±t: already centred on nominal', source) }
    case 'deviations':
      return {
        upper: tolerance.upper,
        lower: tolerance.lower,
        conversion: conversionOf(tolerance.upper === -tolerance.lower
          ? '±t: already centred on nominal'
          : 'nominal +u/+l → mean (nominal + (u + l)/2) ± half band (u − l)/2', source),
      }
    case 'limits':
      return {
        upper: tolerance.max - nominal,
        lower: tolerance.min - nominal,
        conversion: conversionOf('limits min … max → mean (min + max)/2 ± half band (max − min)/2', source),
      }
  }
}

/**
 * A linked part stack enters an assembly with its worst-case band (for WC)
 * and its own σ (for RSS). σ of the part stack already combines the
 * variances of its contributors (σ² = Σ(a_i·σ_i)²), so the assembly's
 * σ² = Σ(a_j·σ_j)² over its rows is the same as stacking every dimension of
 * every part directly, as long as no dimension appears in two rows
 * (independent contributors; Drake ch. 9 and ch. 11).
 * The WC band keeps its ⟨ST⟩ part apart (StackResult.statisticalHalfBand),
 * so the assembly combines it by RSS with its own ⟨ST⟩ rows.
 */
const LINKED_CONVERSION = conversionOf(
  'linked part stack: worst case uses its WC band (nominal +upper/+lower deviation; its ⟨ST⟩ part by RSS), RSS uses its σ',
  `${SOURCE.drakeStacks}; ${SOURCE.drakeQuality}; ${SOURCE.statisticalTolerance}`,
)

/**
 * The ⟨ST⟩ part of a linked stack's WC half band: statisticalHalfBand, or
 * the half band less arithmeticHalfBand when only that is stored; 0 for a
 * result stored before the parts were kept (all arithmetic, as before).
 * Clamped to the half band against round-off.
 */
export function linkedStatisticalPart(stack: StackResult): number {
  const halfBand = (stack.upperDeviation - stack.lowerDeviation) / 2
  const statistical = stack.statisticalHalfBand ?? (stack.arithmeticHalfBand === undefined ? 0 : halfBand - stack.arithmeticHalfBand)
  return Math.min(Math.max(statistical, 0), halfBand)
}

/**
 * ⟨ST⟩ on a tolerance: it is to be produced under statistical process
 * control, so the stack may treat it statistically. In the worst-case
 * method, the ⟨ST⟩ rows are combined by RSS and added arithmetically to the
 * rest (analyseStack.ts).
 */
const STATISTICAL_NOTE = `⟨ST⟩ statistical tolerance: combined by RSS with the other ⟨ST⟩ rows, also in the worst-case result (${SOURCE.statisticalTolerance}). `
  // ASME Y14.5-2018 asks for a drawing note with ⟨ST⟩ that the feature is made under statistical process control.
  + 'The drawing must carry the note that features marked ⟨ST⟩ are produced with statistical process control; without it, stack the row arithmetically.'

/** One contributor as a band about its mean. Input is validated first (validate.ts). */
export function centredContributor(contributor: Contributor, index: number, standard: DrawingStandard = 'iso'): CentredContributor {
  const base = { index, label: contributor.label, sensitivity: contributor.sensitivity, kind: contributor.kind }
  if (contributor.kind === 'linked') {
    const { nominal, upperDeviation, lowerDeviation, sigma } = contributor.stack
    return {
      ...base, statistical: false, statisticalHalfBand: linkedStatisticalPart(contributor.stack), nominal,
      min: nominal + lowerDeviation, max: nominal + upperDeviation,
      mean: nominal + (upperDeviation + lowerDeviation) / 2,
      meanShift: (upperDeviation + lowerDeviation) / 2,
      halfBand: (upperDeviation - lowerDeviation) / 2,
      sigma, conversion: LINKED_CONVERSION, geometric: null,
    }
  }
  if (contributor.kind === 'datum-shift') {
    const { upper, lower, conversion, breakdown } = datumShiftDeviations(contributor.datums, standard)
    const halfBand = (upper - lower) / 2
    return {
      ...base, statistical: false, statisticalHalfBand: 0, nominal: 0,
      min: lower, max: upper, mean: 0, meanShift: 0, halfBand,
      // ±t = ±3σ (rules.ts), as for any other row.
      sigma: halfBand / SIGMAS_PER_HALF_BAND,
      conversion, geometric: breakdown,
    }
  }
  const { tolerance } = contributor
  const statistical = contributor.statistical === true
  let deviations: { readonly upper: number; readonly lower: number; readonly conversion: Conversion }
  let geometric: GeometricBreakdown | null = null
  // A row stacked to a feature surface starts at the surface's nominal
  // location: the basic location of the axis ± half the mean size.
  let nominal = contributor.nominal
  if (tolerance.kind === 'geometric') {
    const converted = geometricDeviations(tolerance, standard)
    deviations = converted
    geometric = converted.breakdown
    nominal += converted.nominalOffset
  } else {
    deviations = plainDeviations(nominal, tolerance)
  }
  const { upper, lower } = deviations
  const conversion = statistical
    ? { ...deviations.conversion, modifiers: [...deviations.conversion.modifiers, STATISTICAL_NOTE] }
    : deviations.conversion
  const halfBand = (upper - lower) / 2
  return {
    ...base, statistical, statisticalHalfBand: statistical ? halfBand : 0, nominal,
    min: nominal + lower, max: nominal + upper,
    mean: nominal + (upper + lower) / 2,
    meanShift: (upper + lower) / 2,
    halfBand,
    // ±t = ±3σ (rules.ts).
    sigma: halfBand / SIGMAS_PER_HALF_BAND,
    conversion, geometric,
  }
}

/**
 * Migrating inputs stored before the datum shift became its own row: those
 * geometric rows added their frame's MMB/LMB shift into their own zone.
 * Read now, the same rows give the band without it. This returns one
 * datum-shift row per frame (by its datum letters and modifiers) that has a
 * shift (sizes given) and no datum-shift row in the chain yet, in the order
 * the frames first appear. Old inputs added the shift once per row; one row
 * per frame is the corrected count (Fischer 2011; ASME Y14.5-2018 §7).
 * The UI decides whether to insert them: the shift belongs only where the
 * chain crosses the interface of the datum feature.
 */
export function datumShiftRowsFor(contributors: readonly Contributor[]): readonly DatumShiftContributor[] {
  const present = new Set(contributors.filter((row) => row.kind === 'datum-shift').map((row) => datumFrameText(row.datums).toUpperCase()))
  const rows: DatumShiftContributor[] = []
  for (const contributor of contributors) {
    if (contributor.kind !== 'dimension' || contributor.tolerance.kind !== 'geometric') continue
    const { datums } = contributor.tolerance
    const frame = datumFrameText(datums)
    if (frameDatumShift(datums) <= 0 || present.has(frame.toUpperCase())) continue
    present.add(frame.toUpperCase())
    rows.push({ kind: 'datum-shift', label: `Datum shift ${frame}`, sensitivity: 1, datums: datums ?? [] })
  }
  return rows
}
