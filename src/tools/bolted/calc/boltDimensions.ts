/**
 * Head, nut, washer and clearance-hole dimensions per nominal diameter.
 *
 * - Hexagon head (ISO 4014 / ISO 4017) and hexagon nut (ISO 4032) share the
 *   width across flats, so they share the minimum bearing-face diameter dw
 *   (product grade A up to M24, grade B above).
 * - Hexagon socket head cap screw: ISO 4762 minimum bearing-face diameter dw.
 * - Clearance hole dh: ISO 273 medium series.
 * - Plain washer: ISO 7089 (normal series, 200 HV), inner d1, outer d2, thickness h.
 *
 * VDI 2230-1:2015 uses the minimum dw as the outer bearing diameter dW of the
 * head and nut (§5.1.2 and R10), which is the conservative choice for surface pressure.
 *
 * UNSURE: the dw values for M14, M18, M22, M27 and M33 (second-choice sizes)
 * are recalled, not transcribed; check them against the standards.
 */
export interface BoltDimensions {
  /** dw min of a hexagon head (ISO 4014/4017) or hexagon nut (ISO 4032). */
  readonly hexBearingMm: number
  /** dw min of a hexagon socket head cap screw (ISO 4762). */
  readonly socketBearingMm: number
  /** Clearance hole dh, ISO 273 medium. */
  readonly clearanceHoleMm: number
  /** ISO 7089 plain washer. */
  readonly washer: WasherDimensions
}

export interface WasherDimensions {
  readonly innerMm: number
  readonly outerMm: number
  readonly thicknessMm: number
}

type Row = readonly [hexDw: number, socketDw: number, dh: number, washerD1: number, washerD2: number, washerH: number]

const DIMENSIONS_MM: Readonly<Record<number, Row>> = {
  3: [4.57, 5.07, 3.4, 3.2, 7, 0.5],
  4: [5.88, 6.53, 4.5, 4.3, 9, 0.8],
  5: [6.88, 8.03, 5.5, 5.3, 10, 1],
  6: [8.88, 9.38, 6.6, 6.4, 12, 1.6],
  8: [11.63, 12.33, 9, 8.4, 16, 1.6],
  10: [14.63, 15.33, 11, 10.5, 20, 2],
  12: [16.63, 17.23, 13.5, 13, 24, 2.5],
  14: [19.64, 20.17, 15.5, 15, 28, 2.5],
  16: [22.49, 23.17, 17.5, 17, 30, 3],
  18: [25.34, 25.87, 20, 19, 34, 3],
  20: [28.19, 28.87, 22, 21, 37, 3],
  22: [31.71, 31.81, 24, 23, 39, 3],
  24: [33.61, 34.81, 26, 25, 44, 4],
  27: [38.0, 38.61, 30, 28, 50, 4],
  30: [42.75, 43.61, 33, 31, 56, 4],
  33: [46.55, 47.61, 36, 34, 60, 5],
  36: [51.11, 52.54, 39, 37, 66, 5],
}

/** Dimensions for a nominal diameter in NOMINAL_DIAMETERS_MM (threads.ts validates the size first). */
export function boltDimensions(nominalMm: number): BoltDimensions | null {
  const row = DIMENSIONS_MM[nominalMm]
  if (!row) return null
  const [hexBearingMm, socketBearingMm, clearanceHoleMm, innerMm, outerMm, thicknessMm] = row
  return { hexBearingMm, socketBearingMm, clearanceHoleMm, washer: { innerMm, outerMm, thicknessMm } }
}
