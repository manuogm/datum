import type { Contributor, StackInput, StackResult } from './types'

/**
 * The worked example seeded in the Examples folder, hand-calculated in
 * examples.test.ts and in the engine notes. Lengths in mm. The circlip and
 * groove sizes are typical of a DIN 472 circlip for a 47 mm bore and the
 * bearing width tolerance of a 6204 bearing to ISO 492 normal class; check
 * the catalogue before using them on a real design.
 *
 * Housing (Part mode): the bearing seat of a housing, a bore with a shoulder
 * and an internal circlip groove, dimensioned from the open end face A
 * (x into the housing). The result is the distance from the shoulder to the
 * outer flank of the groove, which the circlip bears against:
 *   L = shoulder depth − groove centre + half groove width.
 */
export const HOUSING_PART_STACK: StackInput = {
  name: 'Housing: shoulder to circlip groove',
  requirement: { min: 20.8, max: 21.1 },
  method: 'worst-case',
  standard: 'iso',
  contributors: [
    { kind: 'dimension', label: 'Shoulder depth from face A', sensitivity: 1, nominal: 42, tolerance: { kind: 'symmetric', plusMinus: 0.05 } },
    {
      kind: 'dimension', label: 'Groove centre from face A (position 0.1 to A)', sensitivity: -1, nominal: 22,
      tolerance: { kind: 'geometric', characteristic: 'position', zone: 0.1, datums: [{ letter: 'A', modifier: 'rmb' }] },
    },
    {
      kind: 'dimension', label: 'Half groove width (1.85 +0.14/0)', sensitivity: 1, nominal: 0.925,
      tolerance: { kind: 'deviations', upper: 0.07, lower: 0 },
    },
  ],
}

/**
 * Assembly mode: axial end play of the bearing outer ring between the
 * housing shoulder and the circlip:
 *   end play = L (housing stack) − bearing width − spacer − circlip thickness.
 * The housing row links the saved housing stack result.
 */
export function endPlayAssembly(housing: StackResult): StackInput {
  const contributors: readonly Contributor[] = [
    { kind: 'linked', label: 'Housing: shoulder to circlip groove', sensitivity: 1, stack: housing },
    { kind: 'dimension', label: 'Bearing 6204 width', sensitivity: -1, nominal: 14, tolerance: { kind: 'deviations', upper: 0, lower: -0.12 } },
    { kind: 'dimension', label: 'Spacer length', sensitivity: -1, nominal: 5, tolerance: { kind: 'symmetric', plusMinus: 0.03 } },
    { kind: 'dimension', label: 'Circlip thickness', sensitivity: -1, nominal: 1.75, tolerance: { kind: 'deviations', upper: 0, lower: -0.06 } },
  ]
  return { name: 'Bearing end play', requirement: { min: 0.1, max: 0.5 }, method: 'worst-case', standard: 'iso', contributors }
}
