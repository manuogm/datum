/**
 * The judgement calls of the fit advisor, in one place.
 *
 * ISO 286 defines the fits and ISO 1 the 20 °C reference temperature; it does
 * NOT say which fit suits an application. Every rule below is engineering
 * judgement (with the reasoning given), so it can be argued with and tuned
 * here without touching the calculation.
 *
 * Rules that use these constants (see checks.ts):
 * - Service window: the share of the in-service clearance range inside the
 *   required window sets the base score.
 * - Assembly interference: interference at assembly temperature must not
 *   exceed the user's limit.
 * - By hand: needs clearance (min clearance ≥ 0) at assembly temperature.
 * - Thermal assembly: heat the housing (or cool the shaft) until there is
 *   ASSEMBLY_CLEARANCE_UM_PER_MM of clearance; heating the housing above its
 *   material's maxServiceTempC is flagged, because it may spoil the temper.
 * - Locate: max clearance in service ≤ LOCATE_MAX_CLEARANCE_IN_IT7 × IT7.
 * - Transmit torque: favours interference at every service temperature
 *   (torque carried by friction); otherwise a key, pin or spline is needed.
 * - Slide / rotate: no interference anywhere in service.
 * - Disassemble often: interference at assembly temperature is penalised.
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
 * Score points deducted per check that is not a pass (window check excluded:
 * it sets the base score). A failed check costs three warnings.
 */
export const SCORE_PENALTY = { pass: 0, warn: 10, fail: 30 } as const
