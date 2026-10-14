// ── Input ────────────────────────────────────────────────────────────────

/**
 * Sensitivity coefficient a_i of a contributor: how much the result changes
 * per unit change of the dimension, ∂result/∂x_i. In a 1D loop it is +1 (the
 * dimension adds to the result) or −1 (it subtracts); 0.5 takes half a
 * diameter or width (a radius, a centre plane). Every sum in the engine is
 * written with a_i, so a later 2D/3D stack can supply coefficients from a
 * vector loop (∂R/∂x_i) without changing the stacking maths.
 */
export type Sensitivity = number

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

/** Size limits of a feature of size (a hole, pin, slot or tab), min ≤ max. */
export interface SizeLimits {
  readonly min: number
  readonly max: number
}

/** Material condition on a tolerance: RFS (regardless of feature size, the default), Ⓜ MMC or Ⓛ LMC. */
export type MaterialCondition = 'rfs' | 'mmc' | 'lmc'

/** Material boundary on a datum reference: RMB (the default), MMB or LMB (ISO 2692: MMR/LMR on the datum). */
export type MaterialBoundary = 'rmb' | 'mmb' | 'lmb'

/** Whether a feature of size is a hole/slot (internal) or a pin/tab (external). Recorded for display; the largest bonus or shift is max − min either way. */
export type FeatureType = 'internal' | 'external'

/** The drawing standard: changes wording and which modifiers a characteristic accepts, not the arithmetic. */
export type DrawingStandard = 'iso' | 'asme'

/**
 * A datum feature referenced in the frame. Only MMB and LMB change the
 * stack (datum shift), and they need the datum feature's size limits.
 * boundaryAllowance: the datum feature's own geometric tolerance at MMC
 * (or LMC) relative to higher-precedence datums, which puts its MMB (LMB) at
 * virtual condition instead of at its MMC (LMC) size; omitted: 0.
 */
export interface DatumReference {
  readonly letter: string
  readonly modifier: MaterialBoundary
  readonly size?: SizeLimits
  readonly featureType?: FeatureType
  readonly boundaryAllowance?: number
}

/**
 * Ⓤ (ASME) / UZ (ISO) unequally disposed profile zone.
 * value: the part of the zone on the side that adds material (the ASME Ⓤ
 *   value; for an ISO UZ offset v towards the outside of the material,
 *   value = zone/2 + v). 0 ≤ value ≤ zone.
 * materialSide: whether adding material at this surface makes the stacked
 *   dimension larger or smaller.
 */
export interface UnequalDisposition {
  readonly value: number
  readonly materialSide: 'larger' | 'smaller'
}

/**
 * Frame modifiers that are recorded and explained but do not change a rigid
 * 1D stack: Ⓕ free state, Ⓣ tangent plane, CZ common zone. See geometric.ts.
 */
export interface InformationalModifiers {
  readonly freeState?: boolean
  readonly tangentPlane?: boolean
  readonly commonZone?: boolean
}

/**
 * A geometric tolerance from a feature control frame (ISO 1101 / ASME Y14.5).
 * zone: the tolerance value in the frame (for a ⌀ zone, its diameter).
 * diameterZone: the value carries ⌀. Recorded; ⌀t and a zone t wide give
 *   the same ±t/2 along one direction.
 * materialCondition: Ⓜ or Ⓛ on the tolerance adds a bonus up to the
 *   feature's size tolerance, so featureSize is then required.
 * datums: the datum references; MMB/LMB ones add a datum shift.
 * unequal: Ⓤ / UZ, profile tolerances only; omitted: equally disposed.
 * projected: Ⓟ with its height (position and orientation only).
 */
export interface GeometricTolerance extends InformationalModifiers {
  readonly kind: 'geometric'
  readonly characteristic: GeometricCharacteristic
  readonly zone: number
  readonly diameterZone?: boolean
  readonly materialCondition?: MaterialCondition
  readonly featureSize?: SizeLimits
  readonly featureType?: FeatureType
  readonly datums?: readonly DatumReference[]
  readonly unequal?: UnequalDisposition
  readonly projected?: { readonly height: number }
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
  readonly sensitivity: Sensitivity
  readonly nominal: number
  readonly tolerance: ContributorTolerance
  /**
   * ⟨ST⟩ statistical tolerance: the contributor is stacked by RSS even in
   * the worst-case method (see analyseStack.ts). Omitted: false.
   */
  readonly statistical?: boolean
}

/** A Part-mode stack result used as one contributor of an Assembly stack. */
export interface LinkedStackContributor {
  readonly kind: 'linked'
  readonly label: string
  readonly sensitivity: Sensitivity
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
  /** Drawing standard of the frames; omitted: 'iso'. Changes wording and the modifiers accepted, not the arithmetic. */
  readonly standard?: DrawingStandard
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
  /** Why the rule is a judgement call, or null. */
  readonly unsure: string | null
  /** One line per modifier in the frame: what it does to this contribution, with its source. */
  readonly modifiers: readonly string[]
}

/**
 * How a geometric tolerance's band was built: the zone in the frame plus the
 * largest bonus (Ⓜ/Ⓛ) and datum shift (MMB/LMB). The band is
 * effectiveZone wide; equally disposed it is ±effectiveZone/2.
 */
export interface GeometricBreakdown {
  readonly zone: number
  readonly bonus: number
  readonly datumShift: number
  readonly effectiveZone: number
}

/** One contributor, centred: the band [min, max] of the dimension itself and its mean ± halfBand. */
export interface ContributorResult {
  /** 0-based position in the chain. */
  readonly index: number
  readonly label: string
  readonly sensitivity: Sensitivity
  readonly kind: Contributor['kind']
  /** ⟨ST⟩: stacked by RSS in the worst-case method too. */
  readonly statistical: boolean
  /** As entered (linked: the part stack's nominal). */
  readonly nominal: number
  readonly min: number
  readonly max: number
  /** (min + max)/2. */
  readonly mean: number
  /** mean − nominal: the shift from centring an unequal band. */
  readonly meanShift: number
  /** (max − min)/2: the worst-case contribution t_i. */
  readonly halfBand: number
  /** halfBand/3 for a dimension (±t = ±3σ); the part stack's σ for a linked stack. */
  readonly sigma: number
  /** Share of the worst-case band, |a_i|·t_i / Σ|a|·t, in % (0 when Σ = 0); ⟨ST⟩ rows share their RSS part by variance. */
  readonly worstCasePercent: number
  /** Share of the variance, (a_i·σ_i)² / Σ(a·σ)², in % (= t_i²/Σt² for ±1 dimensions; 0 when Σ = 0). */
  readonly rssPercent: number
  readonly conversion: Conversion
  /** Geometric tolerances only; null otherwise. */
  readonly geometric: GeometricBreakdown | null
}

/** The result range by one method and its margins to the requirement (negative: outside). */
export interface MethodRange {
  readonly min: number
  readonly max: number
  /** Half the range: Σ|a_i|·t_i (worst case, ⟨ST⟩ rows by RSS) or 3σ (RSS). */
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
  /** The requirement limit with the smaller margin by the chosen method; 'both' when the margins are equal (within LIMIT_TOLERANCE_MM). */
  readonly governing: 'lower' | 'upper' | 'both'
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
  /** Σ a_i·nominal_i: the result with every dimension at its nominal. */
  readonly nominal: number
  /** Σ a_i·mean_i: the centre of both the WC and the RSS range. */
  readonly mean: number
  /** √Σ(a_i·σ_i)². */
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
