/**
 * The judgement calls of the fit advisor, in one place.
 *
 * ISO 286 defines the fits and ISO 1 the 20 °C reference temperature; it does
 * NOT say which fit suits an application. Every rule below is engineering
 * judgement (with the reasoning given), so it can be argued with and tuned
 * here without touching the calculation.
 *
 * The rules (see checks.ts), each with the score points it costs (SCORE_POINTS):
 * - Service window: at each end of the service temperature range, how far
 *   (µm) the clearance range goes outside the required window; the worse end
 *   counts, as a fraction of the window width. The worst end is used because
 *   the fit must work at every service temperature; it also favours fits that
 *   sit in the middle of the thermal swing.
 * - Assembly interference: interference at assembly temperature must not
 *   exceed the user's limit (hard limit: fixed penalty).
 * - By hand: needs clearance (min clearance ≥ 0) at assembly temperature (hard).
 * - Thermal assembly: heat the housing (or cool the shaft) until there is
 *   ASSEMBLY_CLEARANCE_UM_PER_MM of clearance; each kelvin of heating above
 *   the housing material's maxServiceTempC costs points (it may spoil the temper).
 * - Locate: max clearance in service ≤ LOCATE_MAX_CLEARANCE_IN_IT7 × IT7; the
 *   excess, as a fraction of that limit, costs points.
 * - Transmit torque: favours interference at every service temperature
 *   (torque carried by friction); the share of the in-service range that is
 *   clearance costs points, since there a key, pin or spline is needed.
 * - Slide / rotate: no interference anywhere in service (hard: parts seize).
 * - Disassemble often: the share of the assembly-temperature range that is
 *   interference costs points.
 */

/**
 * Diametral clearance wanted while joining a thermally assembled fit, per mm
 * of diameter: 1 µm/mm, i.e. 0.001·D, so the parts slide together before the
 * temperatures equalise. Rule of thumb for shrink fits (the "Fügespiel" of
 * Roloff/Matek Maschinenelemente, chapter on interference fits; quoted from
 * memory, check the edition in use).
 */
export const ASSEMBLY_CLEARANCE_UM_PER_MM = 1

/**
 * Coldest temperature to which a shaft is practically cooled for assembly:
 * liquid nitrogen boils at −196 °C at atmospheric pressure.
 */
export const COLDEST_SHAFT_COOLING_TEMP_C = -196

/**
 * "Locate" accepts a maximum clearance of up to this many IT7 tolerances at
 * the nominal size. 2 × IT7 is about the maximum clearance of H7/g6, the
 * loosest preferred fit ISO describes as locating accurately (42 µm at 25 mm,
 * 70 µm at 100 mm), so the limit scales with size as ISO tolerances do.
 */
export const LOCATE_MAX_CLEARANCE_IN_IT7 = 2

/**
 * Score points deducted by each rule; a candidate starts at 100.
 * The weights rank the requirements: the clearance window the user asked for
 * matters most, then the application functions. A window excursion as wide as
 * the window itself costs 40 points; the application terms cost at most 20
 * each when fully unmet; hard limits (user's interference limit, by hand,
 * seizing) cost a fixed 30.
 */
export const SCORE_POINTS = {
  /** × (worst excursion outside the window ÷ window width) */
  windowPerWidth: 40,
  /** × (excess max clearance ÷ locate limit) */
  locatePerLimit: 20,
  /** × share (0 … 1) of the in-service range that is clearance */
  torqueClearanceShare: 20,
  /** × share (0 … 1) of the assembly-temperature range that is interference */
  disassemblyInterferenceShare: 20,
  /** × kelvin of housing heating above its material's service limit (20 points per 100 K) */
  heatingPerKelvinOverLimit: 0.2,
  /** For a hard limit that is not met. */
  hardLimit: 30,
} as const
