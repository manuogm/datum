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

/**
 * Whether a feature of size is a hole/slot (internal) or a pin/tab
 * (external). The largest bonus or shift is max − min either way; stacking
 * to the feature's surface (stackTo) needs it, because the virtual and
 * resultant condition boundaries of a hole and a pin lie on opposite sides.
 */
export type FeatureType = 'internal' | 'external'

/** The drawing standard: changes wording and which modifiers a characteristic accepts, not the arithmetic. */
export type DrawingStandard = 'iso' | 'asme'

/**
 * A datum feature referenced in the frame. Only MMB and LMB can change the
 * stack (datum shift), and only through a DatumShiftContributor, which
 * needs the datum feature's size limits. On a geometric row the size is
 * optional and only recorded.
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
 *   value; for an ISO UZ offset v of the zone centre towards the outside of
 *   the material, value = zone/2 + v, see unequalValueFromIsoOffset).
 *   ASME Y14.5-2018 §11: 0 ≤ value ≤ zone (the zone touches the true
 *   profile). ISO 1101:2017 UZ: any offset, so the zone may lie wholly on
 *   one side, clear of the true profile (value < 0 or value > zone).
 * materialSide: whether adding material at this surface makes the stacked
 *   dimension larger or smaller.
 */
export interface UnequalDisposition {
  readonly value: number
  readonly materialSide: 'larger' | 'smaller'
}

/**
 * Frame modifiers that are recorded and explained but do not change a rigid
 * 1D stack: Ⓕ free state, Ⓣ tangent plane, CZ combined zone (ISO 1101:2017;
 * ISO only, ASME uses SIM REQT / CF). See geometric.ts.
 */
export interface InformationalModifiers {
  readonly freeState?: boolean
  readonly tangentPlane?: boolean
  readonly commonZone?: boolean
}

/**
 * Where a position (or ISO coaxiality / symmetry) row at Ⓜ/Ⓛ takes the
 * stack:
 * - 'axis': the axis or centre plane of the feature (the default);
 * - 'near-surface': the feature's surface on the side of the axis towards
 *   the origin of this row's dimension (basic − radius);
 * - 'far-surface': the surface on the side away from it (basic + radius).
 * A surface row replaces the position row and the separate radius row: it
 * runs between the virtual and resultant condition boundaries, see
 * surfaceBoundary in geometric.ts.
 */
export type StackTo = 'axis' | 'near-surface' | 'far-surface'

/**
 * A flatness or straightness row whose surface seats on its high points
 * (its location in the chain is that of its high points): the point the
 * stack passes through lies between the high points and t into the
 * material, one-sided 0/−t instead of ±t/2. materialSide: whether adding
 * material at this surface makes the stacked dimension larger or smaller
 * (into the material is then − or + respectively).
 */
export interface HighPointSeating {
  readonly materialSide: 'larger' | 'smaller'
}

/**
 * A geometric tolerance from a feature control frame (ISO 1101 / ASME Y14.5).
 * zone: the tolerance value in the frame (for a ⌀ zone, its diameter).
 * diameterZone: the value carries ⌀. Recorded; ⌀t and a zone t wide give
 *   the same ±t/2 along one direction.
 * materialCondition: Ⓜ or Ⓛ on the tolerance adds a bonus up to the
 *   feature's size tolerance, so featureSize is then required.
 * datums: the datum references. MMB/LMB are recorded here; their datum
 *   shift is its own row (DatumShiftContributor), not part of this zone.
 * unequal: Ⓤ / UZ, profile tolerances only; omitted: equally disposed.
 * projected: Ⓟ with its height (position and orientation only).
 * stackTo: with Ⓜ/Ⓛ on a location tolerance, stack to the feature's
 *   surface by its boundaries; omitted: 'axis'.
 * highPoints: flatness / straightness only; omitted: centred ±t/2.
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
  readonly stackTo?: StackTo
  readonly highPoints?: HighPointSeating
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

/**
 * The datum shift of one datum reference frame as its own row (Fischer
 * 2011, datum feature shift; ASME Y14.5-2018 §7; ISO 2692:2021): the part
 * may move on its datum simulators by the datum features' departure from
 * their MMB (LMB). Its nominal is 0 and its band ±shift/2, shift = Σ over
 * the MMB/LMB datums of (size tolerance + boundaryAllowance).
 * Count it once per datum reference frame, and only where the chain
 * crosses the datum features' interface (from the part to its mating part
 * or fixture); every feature located in that frame moves together, so the
 * shift cancels between two features of one part.
 * frame: optional name that tells two frames with the same letters apart
 * (e.g. the part name).
 */
export interface DatumShiftContributor {
  readonly kind: 'datum-shift'
  readonly label: string
  readonly sensitivity: Sensitivity
  readonly datums: readonly DatumReference[]
  readonly frame?: string
}

export type Contributor = DimensionContributor | LinkedStackContributor | DatumShiftContributor

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
 *
 * The worst-case half band (upper − lower)/2 is the sum of two parts:
 * arithmeticHalfBand, Σ|a|t over the plain rows, and statisticalHalfBand,
 * √Σ(a t)² over the ⟨ST⟩ rows. An assembly adds the first arithmetically
 * and combines the second by RSS with its own ⟨ST⟩ rows, so linking a part
 * gives the same worst case as entering its rows directly. Omitted (a
 * result stored before these fields): the whole band is arithmetic.
 */
export interface StackResult {
  readonly name: string
  readonly nominal: number
  readonly mean: number
  readonly upperDeviation: number
  readonly lowerDeviation: number
  readonly sigma: number
  readonly arithmeticHalfBand?: number
  readonly statisticalHalfBand?: number
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
 * The surface of a feature of size between its two boundaries (ASME
 * Y14.5-2018 §5 virtual / resultant condition; Fischer 2011): diameters (or
 * widths) VC and RC, so the surface lies between VC/2 and RC/2 from the true
 * position. innerRadius = min(VC, RC)/2, outerRadius = max(VC, RC)/2.
 * side: −1 near surface, +1 far surface. nominalRadius: half the mean size,
 * (min + max)/4, which the row's nominal includes.
 */
export interface SurfaceBoundary {
  readonly side: -1 | 1
  readonly virtualCondition: number
  readonly resultantCondition: number
  readonly innerRadius: number
  readonly outerRadius: number
  readonly nominalRadius: number
}

/**
 * How a geometric tolerance's band was built: the zone in the frame plus the
 * largest bonus (Ⓜ/Ⓛ). The band is effectiveZone wide; equally disposed it
 * is ±effectiveZone/2.
 * datumShift: the shift added to this band. Geometric rows no longer add
 * one (it is a DatumShiftContributor row), so it is 0 on them and the
 * shift itself on a datum-shift row. frameDatumShift: the largest shift the
 * frame's MMB/LMB datums allow, for the note that it belongs in its own row.
 * surface: the boundaries when the row is stacked to the feature's surface
 * (stackTo), else null.
 */
export interface GeometricBreakdown {
  readonly zone: number
  readonly bonus: number
  readonly datumShift: number
  readonly effectiveZone: number
  readonly frameDatumShift: number
  readonly surface: SurfaceBoundary | null
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
  /**
   * The part of halfBand combined by RSS in the worst case: halfBand for an
   * ⟨ST⟩ row, 0 for another dimension, the part's statisticalHalfBand for a
   * linked stack.
   */
  readonly statisticalHalfBand: number
  /**
   * As entered (linked: the part stack's nominal; datum shift: 0). A row
   * stacked to the feature surface: the basic location ± half the mean size
   * (GeometricBreakdown.surface.nominalRadius).
   */
  readonly nominal: number
  readonly min: number
  readonly max: number
  /** (min + max)/2. */
  readonly mean: number
  /** mean − nominal: the shift from centring an unequal band. */
  readonly meanShift: number
  /** (max − min)/2: the worst-case contribution t_i. */
  readonly halfBand: number
  /** halfBand/3 for a dimension or datum shift (±t = ±3σ); the part stack's σ for a linked stack. */
  readonly sigma: number
  /** Share of the worst-case band, |a_i|·t_i / Σ|a|·t, in % (0 when Σ = 0); ⟨ST⟩ parts share the RSS part by variance. */
  readonly worstCasePercent: number
  /** Share of the variance, (a_i·σ_i)² / Σ(a·σ)², in % (= t_i²/Σt² for ±1 dimensions; 0 when Σ = 0). */
  readonly rssPercent: number
  readonly conversion: Conversion
  /** Geometric tolerances and datum-shift rows; null otherwise. */
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
 * Worst-case method:
 * - 'worst-case-within': WC range inside the requirement.
 * - 'only-rss-within': WC outside, RSS (±3σ) inside.
 * - 'rss-outside': RSS (±3σ) outside.
 * RSS method, by capability (AIAG SPC Manual 2005; Montgomery §8.3):
 * - 'rss-capable': Cpk ≥ 1.33 (pass); with σ = 0, the mean is inside.
 * - 'rss-marginal': 1.00 ≤ Cpk < 1.33 (review).
 * - 'rss-not-capable': Cpk < 1.00, ±3σ outside (fail).
 * Deprecated, no longer produced (the RSS method graded by ±2σ before):
 * 'rss-within', 'only-two-sigma-within', 'two-sigma-outside'.
 */
export type VerdictBasis =
  | 'worst-case-within' | 'only-rss-within' | 'rss-outside'
  | 'rss-capable' | 'rss-marginal' | 'rss-not-capable'
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
  /**
   * Things to check that do not stop the calculation, one sentence each,
   * naming the row (see validate.ts, inputWarnings): a characteristic or
   * modifier not in the drawing standard, a line profile without datums, a
   * datum shift missing or counted twice, a tertiary datum shift.
   */
  readonly warnings: readonly string[]
}
