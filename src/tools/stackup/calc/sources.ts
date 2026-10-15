/**
 * Where the rules of the stack-up engine come from, used in comments, in the
 * Conversion records shown under "Show calculation" and in the report.
 * Chapters are named where the rule is stated; editions are the ones the
 * rules were checked against.
 */
export const SOURCE = {
  /** Loop diagram, worst case and RSS stacking, converting unequal tolerances to mean ± equal bilateral, GD&T in 1D stacks. */
  drakeStacks: 'Drake, Dimensioning and Tolerancing Handbook (McGraw-Hill 1999), ch. 9',
  /** Statistical tolerancing: ±3σ, defect rates from normal tails, Cp and Cpk. */
  drakeQuality: 'Drake, Dimensioning and Tolerancing Handbook (McGraw-Hill 1999), ch. 11',
  /** Arithmetic and statistical stacking of the mean and the band of each link. */
  fortini: 'Fortini, Dimensioning for Interchangeable Manufacture (Industrial Press 1967)',
  /**
   * GD&T in stacks: converting a frame to equal bilateral, and stacking to the
   * surface of a feature at MMC/LMC by its virtual and resultant condition
   * boundaries; datum feature shift as its own contributor.
   */
  fischer: 'Fischer, Mechanical Tolerance Stackup and Analysis (2nd ed., CRC Press 2011)',
  asme: 'ASME Y14.5-2018',
  /** Concentricity and symmetry were removed from ASME Y14.5 in 2018; the 2009 edition still defines them. */
  asme2009: 'ASME Y14.5-2009',
  iso1101: 'ISO 1101:2017',
  /** Maximum and least material requirements (Ⓜ, Ⓛ), also on datum features. */
  iso2692: 'ISO 2692:2021',
  /** Non-rigid parts: free state and restrained condition. */
  iso10579: 'ISO 10579:2010',
  /** Independency principle: in ISO drawings form is not limited by size unless Ⓔ (envelope) is given. */
  iso8015: 'ISO 8015:2011',
  /** ⟨ST⟩ statistical tolerance: the hybrid worst-case stack (RSS of the ⟨ST⟩ rows, added arithmetically to the rest). */
  statisticalTolerance: 'ASME Y14.5-2018 (statistical tolerancing, ⟨ST⟩); Drake, Dimensioning and Tolerancing Handbook (McGraw-Hill 1999), ch. 9',
  /** Capability acceptance: Cpk ≥ 1.33 capable, 1.00 … 1.33 marginal, below 1.00 not capable. */
  aiag: 'AIAG, Statistical Process Control (SPC) Reference Manual (2nd ed., 2005)',
  /** Cp = (USL − LSL)/6σ, Cpk = min(USL − µ, µ − LSL)/3σ. */
  montgomery: 'Montgomery, Introduction to Statistical Quality Control (7th ed., Wiley 2013), §8.3',
  /** erfc by a Chebyshev fit, fractional error below 1.2·10⁻⁷ everywhere. */
  numericalRecipes: 'Press et al., Numerical Recipes in C (2nd ed. 1992), §6.2, erfcc',
} as const
