import { fail, ok, type Result } from '../../../core/result'

/**
 * ISO general-purpose metric screw threads M3 … M36.
 *
 * Pitches: ISO 261:1998 (coarse pitch and the fine pitches listed for each
 * nominal diameter). Basic dimensions: ISO 724:1993 from the ISO 68-1 basic
 * profile (fundamental triangle height H = √3/2 · P). Bolt minor diameter d3
 * and stress area As: ISO 898-1:2013 §9.1.6.1 and ISO 965-1, as used by
 * VDI 2230-1:2015 §5.1.1.1.
 */
const PITCHES_MM: Readonly<Record<number, { readonly coarse: number; readonly fine: readonly number[] }>> = {
  3: { coarse: 0.5, fine: [0.35] },
  4: { coarse: 0.7, fine: [0.5] },
  5: { coarse: 0.8, fine: [0.5] },
  6: { coarse: 1, fine: [0.75] },
  8: { coarse: 1.25, fine: [1, 0.75] },
  10: { coarse: 1.5, fine: [1.25, 1, 0.75] },
  12: { coarse: 1.75, fine: [1.5, 1.25, 1] },
  14: { coarse: 2, fine: [1.5, 1.25, 1] },
  16: { coarse: 2, fine: [1.5, 1] },
  18: { coarse: 2.5, fine: [2, 1.5, 1] },
  20: { coarse: 2.5, fine: [2, 1.5, 1] },
  22: { coarse: 2.5, fine: [2, 1.5, 1] },
  24: { coarse: 3, fine: [2, 1.5, 1] },
  27: { coarse: 3, fine: [2, 1.5, 1] },
  30: { coarse: 3.5, fine: [3, 2, 1.5, 1] },
  33: { coarse: 3.5, fine: [3, 2, 1.5] },
  36: { coarse: 4, fine: [3, 2, 1.5] },
}

/** Nominal diameters covered, ascending: 3, 4, 5, 6, 8, … 36 mm. */
export const NOMINAL_DIAMETERS_MM: readonly number[] = Object.keys(PITCHES_MM).map(Number).sort((a, b) => a - b)

/** Coarse pitch first, then the fine pitches, for a thread picker. */
export function pitchesForMm(nominalMm: number): readonly number[] {
  const pitches = PITCHES_MM[nominalMm]
  return pitches ? [pitches.coarse, ...pitches.fine] : []
}

export interface ThreadGeometry {
  /** 'M10' for coarse pitch, 'M10×1.25' for fine pitch (ISO 965-1 designation). */
  readonly designation: string
  /** Nominal (major) diameter d. */
  readonly nominalMm: number
  readonly pitchMm: number
  readonly coarse: boolean
  /** Pitch diameter d2 = D2 = d − 0.649519·P (ISO 724). */
  readonly pitchDiameterMm: number
  /** Bolt minor diameter d3 = d − 1.226869·P (root radius H/6, ISO 965-1). */
  readonly boltMinorDiameterMm: number
  /** Nut minor diameter D1 = d − 1.082532·P (ISO 724). */
  readonly nutMinorDiameterMm: number
  /** Stress diameter ds = (d2 + d3)/2: the diameter of As (VDI 2230 d0 for a bolt without waisted shank). */
  readonly stressDiameterMm: number
  /** Nominal cross-section AN = π/4·d². */
  readonly nominalAreaMm2: number
  /** Minor-diameter cross-section Ad3 = π/4·d3². */
  readonly minorAreaMm2: number
  /** Tensile stress area As = π/4·((d2 + d3)/2)² (ISO 898-1 eq. 9.1.6.1). */
  readonly stressAreaMm2: number
}

const circleAreaMm2 = (diameterMm: number) => (Math.PI / 4) * diameterMm ** 2

/** Basic dimensions of a metric thread; the pitch defaults to the coarse pitch. */
export function threadGeometry(nominalMm: number, pitchMm?: number): Result<ThreadGeometry> {
  const pitches = PITCHES_MM[nominalMm]
  if (!pitches) {
    return fail(`M${nominalMm} is not covered: choose a nominal diameter from M${NOMINAL_DIAMETERS_MM[0]} to M${NOMINAL_DIAMETERS_MM.at(-1)} (ISO 261 first and second choice).`)
  }
  const pitch = pitchMm ?? pitches.coarse
  if (!pitchesForMm(nominalMm).includes(pitch)) {
    return fail(`M${nominalMm}×${pitch} is not an ISO 261 thread; pitches for M${nominalMm}: ${pitchesForMm(nominalMm).join(', ')} mm.`)
  }
  const coarse = pitch === pitches.coarse
  const d2 = nominalMm - 0.649519 * pitch
  const d3 = nominalMm - 1.226869 * pitch
  const stressDiameterMm = (d2 + d3) / 2
  return ok({
    designation: coarse ? `M${nominalMm}` : `M${nominalMm}×${pitch}`,
    nominalMm,
    pitchMm: pitch,
    coarse,
    pitchDiameterMm: d2,
    boltMinorDiameterMm: d3,
    nutMinorDiameterMm: nominalMm - 1.082532 * pitch,
    stressDiameterMm,
    nominalAreaMm2: circleAreaMm2(nominalMm),
    minorAreaMm2: circleAreaMm2(d3),
    stressAreaMm2: circleAreaMm2(stressDiameterMm),
  })
}

/** Annulus area π/4·(outer² − inner²), e.g. the bearing area under a bolt head. */
export function annulusAreaMm2(outerMm: number, innerMm: number): number {
  return circleAreaMm2(outerMm) - circleAreaMm2(innerMm)
}
