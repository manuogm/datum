// ── Input ────────────────────────────────────────────────────────────────

/** Direction of a contributor in the loop: +1 adds to the result, −1 subtracts from it. */
export type Sign = 1 | -1

/** Stack-up methods, see analyseStack.ts. */
export type StackMethod = 'worst-case' | 'rss'

/**
 * A plain size or location tolerance on a dimension.
 * - symmetric: nominal ± plusMinus (plusMinus ≥ 0).
 * - deviations: signed deviations from nominal, as in ISO 286 (es/ei, ES/EI):
 *   max = nominal + upper, min = nominal + lower, upper ≥ lower.
 *   "14 +0/−0.12" is { upper: 0, lower: −0.12 }; "20 +0.10/−0.05" is
 *   { upper: 0.10, lower: −0.05 }; both deviations may have the same sign
 *   ("8 +0.30/+0.10" is { upper: 0.30, lower: 0.10 }).
 * - limits: the smallest and largest size, min ≤ max. The contributor's
 *   nominal is kept for display; the stack uses the limits.
 */
export type PlainTolerance =
  | { readonly kind: 'symmetric'; readonly plusMinus: number }
  | { readonly kind: 'deviations'; readonly upper: number; readonly lower: number }
  | { readonly kind: 'limits'; readonly min: number; readonly max: number }

/** The geometric characteristics the engine converts to a ± contribution, see geometric.ts. */
export type GeometricCharacteristic =
  | 'position' | 'profile-surface' | 'profile-line'
  | 'flatness' | 'straightness'
  | 'parallelism' | 'perpendicularity' | 'angularity'
  | 'circular-runout' | 'total-runout'
  | 'coaxiality' | 'symmetry'

/**
 * A geometric tolerance from a feature control frame (ISO 1101 / ASME Y14.5),
 * without material modifiers: no MMC/LMC bonus in v1.
 * zone: the tolerance value in the frame (for a ⌀ zone, its diameter).
 * plusShare: profile tolerances only, the part of the zone on the + side of
 * the true profile, measured in the direction of the dimension. Omitted:
 * zone/2 (equally disposed, the default of both standards). 0 or zone gives
 * a zone entirely on one side (ISO 1101 UZ, ASME Y14.5 Ⓤ).
 */
export interface GeometricTolerance {
  readonly kind: 'geometric'
  readonly characteristic: GeometricCharacteristic
  readonly zone: number
  readonly plusShare?: number
}

export type ContributorTolerance = PlainTolerance | GeometricTolerance

/**
 * One dimension of the chain. nominal: the dimension on the drawing (for a
 * geometric tolerance the basic dimension it locates, or 0 when the
 * geometric tolerance is its own row in the chain).
 */
export interface DimensionContributor {
  readonly kind: 'dimension'
  readonly label: string
  readonly sign: Sign
  readonly nominal: number
  readonly tolerance: ContributorTolerance
}

/** A Part-mode stack result used as one contributor of an Assembly stack. */
export interface LinkedStackContributor {
  readonly kind: 'linked'
  readonly label: string
  readonly sign: Sign
  readonly stack: StackResult
}

export type Contributor = DimensionContributor | LinkedStackContributor

/** Allowed range of the result; either limit may be left out. */
export interface Requirement {
  readonly min?: number
  readonly max?: number
}

export interface StackInput {
  /** Name of the result, e.g. "Housing: shoulder to circlip groove"; it names the StackResult. */
  readonly name: string
  readonly contributors: readonly Contributor[]
  readonly requirement?: Requirement
  /** Method the verdict uses; omitted: DEFAULT_METHOD (worst case). */
  readonly method?: StackMethod
}

// ── Output ───────────────────────────────────────────────────────────────

/**
 * The compact result of a stack, as an Assembly stack consumes it.
 * upperDeviation and lowerDeviation are the worst-case limits relative to
 * nominal (WC max − nominal, WC min − nominal). sigma is the standard
 * deviation of the result by RSS. mean = nominal + (upper + lower)/2; it is
 * carried for display, the engine works from the deviations.
 */
export interface StackResult {
  readonly name: string
  readonly nominal: number
  readonly mean: number
  readonly upperDeviation: number
  readonly lowerDeviation: number
  readonly sigma: number
}

/** How a contributor's tolerance became a band about its mean, for "Show calculation" and the report. */
export interface Conversion {
  /** e.g. 'unequal bilateral → mean ± half band', 'position ⌀t → ±t/2'. */
  readonly rule: string
  readonly source: string
  /** When to include it in a chain, for geometric tolerances; null otherwise. */
  readonly appliesWhen: string | null
}

/** One contributor, centred: the band [min, max] of the dimension itself and its mean ± halfBand. */
export interface ContributorResult {
  /** 0-based position in the chain. */
  readonly index: number
  readonly label: string
  readonly sign: Sign
  readonly kind: Contributor['kind']
  /** As entered (linked: the part stack's nominal). */
  readonly nominal: number
  readonly min: number
  readonly max: number
  /** (min + max)/2. */
  readonly mean: number
  /** (max − min)/2: the worst-case contribution t_i. */
  readonly halfBand: number
  /** halfBand/3 for a dimension (±t = ±3σ); the part stack's σ for a linked stack. */
  readonly sigma: number
  /** Share of the worst-case band, |t_i| / Σ|t|, in % (0 when Σ = 0). */
  readonly worstCasePercent: number
  /** Share of the variance, σ_i² / Σσ², in % (= t_i²/Σt² for dimensions; 0 when Σ = 0). */
  readonly rssPercent: number
  readonly conversion: Conversion
}

/** The result range by one method and its margins to the requirement (negative: outside). */
export interface MethodRange {
  readonly min: number
  readonly max: number
  /** Half the range: Σ t_i (worst case) or 3σ (RSS). */
  readonly halfBand: number
  /** min − requirement.min; null without a lower requirement. */
  readonly lowerMargin: number | null
  /** requirement.max − max; null without an upper requirement. */
  readonly upperMargin: number | null
  /** Both margins ≥ 0 (within LIMIT_TOLERANCE); null without a requirement. */
  readonly withinRequirement: boolean | null
}

export type VerdictStatus = 'pass' | 'review' | 'fail'

/**
 * Why the verdict is what it is (see rules.ts, verdictOf):
 * - 'worst-case-within': WC range inside the requirement.
 * - 'only-rss-within': WC outside, RSS (±3σ) inside.
 * - 'rss-outside': RSS (±3σ) outside (worst-case method).
 * - 'rss-within': RSS (±3σ) inside (RSS method).
 * - 'only-two-sigma-within': ±3σ outside, ±2σ inside (RSS method).
 * - 'two-sigma-outside': ±2σ outside (RSS method).
 */
export type VerdictBasis =
  | 'worst-case-within' | 'only-rss-within' | 'rss-outside'
  | 'rss-within' | 'only-two-sigma-within' | 'two-sigma-outside'

export interface Verdict {
  readonly method: StackMethod
  readonly status: VerdictStatus
  readonly basis: VerdictBasis
  /** The requirement limit with the smaller margin by the chosen method. */
  readonly governing: 'lower' | 'upper'
}

/** Estimated fraction of results outside the requirement, assuming a normal result N(mean, σ). */
export interface FractionOutOfSpec {
  readonly below: number
  readonly above: number
  readonly total: number
}

/**
 * Process capability of the RSS result: Cp needs both limits; Cpk uses the
 * limits given (one-sided Cpl or Cpu with one limit). null when not defined
 * (missing limits, or σ = 0).
 */
export interface Capability {
  readonly cp: number | null
  readonly cpk: number | null
}

export interface StackAnalysis {
  readonly name: string
  readonly contributors: readonly ContributorResult[]
  /** Σ sign·nominal: the result with every dimension at its nominal. */
  readonly nominal: number
  /** Σ sign·mean: the centre of both the WC and the RSS range. */
  readonly mean: number
  /** √Σσ_i². */
  readonly sigma: number
  readonly worstCase: MethodRange
  readonly rss: MethodRange
  readonly requirement: Requirement | null
  readonly method: StackMethod
  /** null without a requirement. */
  readonly verdict: Verdict | null
  /** RSS result; null without a requirement. */
  readonly fractionOutOfSpec: FractionOutOfSpec | null
  readonly capability: Capability
  /** Index of the largest contributor by each method; null when every band is zero. */
  readonly dominant: { readonly worstCase: number | null; readonly rss: number | null }
  /** This stack as a contributor for an Assembly stack. */
  readonly stackResult: StackResult
}
