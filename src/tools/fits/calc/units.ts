/** Unit helpers. Deviations are handled in micrometres (µm), sizes in millimetres (mm). */

const UM_PER_MM = 1000

/**
 * Removes floating-point noise (e.g. 1.2 − 0.8 = 0.39999…) from a µm value.
 * The finest value in ISO 286 is 0.15 µm (half of IT01 = 0.3 µm), so
 * three decimals of a micrometre are more than enough.
 * Also turns −0 (from negating a zero deviation) into 0.
 */
export function roundUm(valueUm: number): number {
  return Math.round(valueUm * 1000) / 1000 || 0
}

/** Nominal size plus a deviation, giving a limit of size in mm (rounded to 1 nm). */
export function addDeviationToSizeMm(nominalMm: number, deviationUm: number): number {
  return Math.round((nominalMm + deviationUm / UM_PER_MM) * 1e6) / 1e6
}
