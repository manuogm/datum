import { notTabulatedMessage, type FundamentalDeviation } from './fundamentalDeviation'
import type { DeviationLetter } from './letters'
import { fail, ok, type Result } from '../../../core/result'
import { valueForSize, type SizeTable } from './sizeTable'
import { SOURCE } from './sources'
import { gradeNumber, type ToleranceGrade } from './toleranceGrades'

/**
 * Upper deviation es (µm) of shafts a to h.
 * Source: ISO 286-1:2010, table of fundamental deviations for shafts a to j. Rows follow the size subdivisions the table
 * uses for each letter. Blank cells are `null`; sizes after the last row are
 * not tabulated (a, b, c and cd, ef, fg stop where the standard stops).
 *
 * a and b: table note: not to be used for nominal sizes ≤ 1 mm.
 * cd, ef, fg: tabulated only up to 10 mm (intended mainly for fine mechanics).
 */
export const UPPER_DEVIATION_TABLES_UM = {
  a: [[1, null], [3, -270], [6, -270], [10, -280], [18, -290], [30, -300], [40, -310], [50, -320],
    [65, -340], [80, -360], [100, -380], [120, -410], [140, -460], [160, -520], [180, -580],
    [200, -660], [225, -740], [250, -820], [280, -920], [315, -1050], [355, -1200], [400, -1350],
    [450, -1500], [500, -1650]],
  b: [[1, null], [3, -140], [6, -140], [10, -150], [18, -150], [30, -160], [40, -170], [50, -180],
    [65, -190], [80, -200], [100, -220], [120, -240], [140, -260], [160, -280], [180, -310],
    [200, -340], [225, -380], [250, -420], [280, -480], [315, -540], [355, -600], [400, -680],
    [450, -760], [500, -840]],
  c: [[3, -60], [6, -70], [10, -80], [18, -95], [30, -110], [40, -120], [50, -130], [65, -140],
    [80, -150], [100, -170], [120, -180], [140, -200], [160, -210], [180, -230], [200, -240],
    [225, -260], [250, -280], [280, -300], [315, -330], [355, -360], [400, -400], [450, -440],
    [500, -480]],
  cd: [[3, -34], [6, -46], [10, -56]],
  d: [[3, -20], [6, -30], [10, -40], [18, -50], [30, -65], [50, -80], [80, -100], [120, -120],
    [180, -145], [250, -170], [315, -190], [400, -210], [500, -230], [630, -260], [800, -290],
    [1000, -320], [1250, -350], [1600, -390], [2000, -430], [2500, -480], [3150, -520]],
  e: [[3, -14], [6, -20], [10, -25], [18, -32], [30, -40], [50, -50], [80, -60], [120, -72],
    [180, -85], [250, -100], [315, -110], [400, -125], [500, -135], [630, -145], [800, -160],
    [1000, -170], [1250, -195], [1600, -220], [2000, -240], [2500, -260], [3150, -290]],
  ef: [[3, -10], [6, -14], [10, -18]],
  f: [[3, -6], [6, -10], [10, -13], [18, -16], [30, -20], [50, -25], [80, -30], [120, -36],
    [180, -43], [250, -50], [315, -56], [400, -62], [500, -68], [630, -76], [800, -80],
    [1000, -86], [1250, -98], [1600, -110], [2000, -120], [2500, -130], [3150, -145]],
  fg: [[3, -4], [6, -6], [10, -8]],
  g: [[3, -2], [6, -4], [10, -5], [18, -6], [30, -7], [50, -9], [80, -10], [120, -12],
    [180, -14], [250, -15], [315, -17], [400, -18], [500, -20], [630, -22], [800, -24],
    [1000, -26], [1250, -28], [1600, -30], [2000, -32], [2500, -34], [3150, -38]],
  h: [[3150, 0]],
} satisfies Record<string, SizeTable<number | null>>

/**
 * Lower deviation ei (µm) of shafts m to zc.
 * Source: ISO 286-1:2010, table of fundamental deviations for shafts k to zc.
 * Same conventions as above.
 * t is blank up to 24 mm, v up to 14 mm and y up to 18 mm; v and x to zc are
 * tabulated only up to 500 mm.
 */
export const LOWER_DEVIATION_TABLES_UM = {
  m: [[3, 2], [6, 4], [10, 6], [18, 7], [30, 8], [50, 9], [80, 11], [120, 13], [180, 15], [250, 17],
    [315, 20], [400, 21], [500, 23], [630, 26], [800, 30], [1000, 34], [1250, 40], [1600, 48],
    [2000, 58], [2500, 68], [3150, 76]],
  n: [[3, 4], [6, 8], [10, 10], [18, 12], [30, 15], [50, 17], [80, 20], [120, 23], [180, 27],
    [250, 31], [315, 34], [400, 37], [500, 40], [630, 44], [800, 50], [1000, 56], [1250, 66],
    [1600, 78], [2000, 92], [2500, 110], [3150, 135]],
  p: [[3, 6], [6, 12], [10, 15], [18, 18], [30, 22], [50, 26], [80, 32], [120, 37], [180, 43],
    [250, 50], [315, 56], [400, 62], [500, 68], [630, 78], [800, 88], [1000, 100], [1250, 120],
    [1600, 140], [2000, 170], [2500, 195], [3150, 240]],
  r: [[3, 10], [6, 15], [10, 19], [18, 23], [30, 28], [50, 34], [65, 41], [80, 43], [100, 51],
    [120, 54], [140, 63], [160, 65], [180, 68], [200, 77], [225, 80], [250, 84], [280, 94],
    [315, 98], [355, 108], [400, 114], [450, 126], [500, 132], [560, 150], [630, 155], [710, 175],
    [800, 185], [900, 210], [1000, 220], [1120, 250], [1250, 260], [1400, 300], [1600, 330],
    [1800, 370], [2000, 400], [2240, 440], [2500, 460], [2800, 550], [3150, 580]],
  s: [[3, 14], [6, 19], [10, 23], [18, 28], [30, 35], [50, 43], [65, 53], [80, 59], [100, 71],
    [120, 79], [140, 92], [160, 100], [180, 108], [200, 122], [225, 130], [250, 140], [280, 158],
    [315, 170], [355, 190], [400, 208], [450, 232], [500, 252], [560, 280], [630, 310], [710, 340],
    [800, 380], [900, 430], [1000, 470], [1120, 520], [1250, 580], [1400, 640], [1600, 720],
    [1800, 820], [2000, 920], [2240, 1000], [2500, 1100], [2800, 1250], [3150, 1400]],
  t: [[24, null], [30, 41], [40, 48], [50, 54], [65, 66], [80, 75], [100, 91], [120, 104], [140, 122],
    [160, 134], [180, 146], [200, 166], [225, 180], [250, 196], [280, 218], [315, 240], [355, 268],
    [400, 294], [450, 330], [500, 360], [560, 400], [630, 450], [710, 500], [800, 560], [900, 620],
    [1000, 680], [1120, 780], [1250, 840], [1400, 960], [1600, 1050], [1800, 1200], [2000, 1350],
    [2240, 1500], [2500, 1650], [2800, 1900], [3150, 2100]],
  u: [[3, 18], [6, 23], [10, 28], [18, 33], [24, 41], [30, 48], [40, 60], [50, 70], [65, 87],
    [80, 102], [100, 124], [120, 144], [140, 170], [160, 190], [180, 210], [200, 236], [225, 258],
    [250, 284], [280, 315], [315, 350], [355, 390], [400, 435], [450, 490], [500, 540], [560, 600],
    [630, 660], [710, 740], [800, 840], [900, 940], [1000, 1050], [1120, 1150], [1250, 1300],
    [1400, 1450], [1600, 1600], [1800, 1850], [2000, 2000], [2240, 2300], [2500, 2500],
    [2800, 2900], [3150, 3200]],
  v: [[14, null], [18, 39], [24, 47], [30, 55], [40, 68], [50, 81], [65, 102], [80, 120], [100, 146],
    [120, 172], [140, 202], [160, 228], [180, 252], [200, 284], [225, 310], [250, 340], [280, 385],
    [315, 425], [355, 475], [400, 530], [450, 595], [500, 660]],
  x: [[3, 20], [6, 28], [10, 34], [14, 40], [18, 45], [24, 54], [30, 64], [40, 80], [50, 97],
    [65, 122], [80, 146], [100, 178], [120, 210], [140, 248], [160, 280], [180, 310], [200, 350],
    [225, 385], [250, 425], [280, 475], [315, 525], [355, 590], [400, 660], [450, 740], [500, 820]],
  y: [[18, null], [24, 63], [30, 75], [40, 94], [50, 114], [65, 144], [80, 174], [100, 214],
    [120, 254], [140, 300], [160, 340], [180, 380], [200, 425], [225, 470], [250, 520], [280, 580],
    [315, 650], [355, 730], [400, 820], [450, 920], [500, 1000]],
  z: [[3, 26], [6, 35], [10, 42], [14, 50], [18, 60], [24, 73], [30, 88], [40, 112], [50, 136],
    [65, 172], [80, 210], [100, 258], [120, 310], [140, 365], [160, 415], [180, 465], [200, 520],
    [225, 575], [250, 640], [280, 710], [315, 790], [355, 900], [400, 1000], [450, 1100], [500, 1250]],
  za: [[3, 32], [6, 42], [10, 52], [14, 64], [18, 77], [24, 98], [30, 118], [40, 148], [50, 180],
    [65, 226], [80, 274], [100, 335], [120, 400], [140, 470], [160, 535], [180, 600], [200, 670],
    [225, 740], [250, 820], [280, 920], [315, 1000], [355, 1150], [400, 1300], [450, 1450], [500, 1600]],
  zb: [[3, 40], [6, 50], [10, 67], [14, 90], [18, 108], [24, 136], [30, 160], [40, 200], [50, 242],
    [65, 300], [80, 360], [100, 445], [120, 525], [140, 620], [160, 700], [180, 780], [200, 880],
    [225, 960], [250, 1050], [280, 1200], [315, 1300], [355, 1500], [400, 1650], [450, 1850], [500, 2100]],
  zc: [[3, 60], [6, 80], [10, 97], [14, 130], [18, 150], [24, 188], [30, 218], [40, 274], [50, 325],
    [65, 405], [80, 480], [100, 585], [120, 690], [140, 800], [160, 900], [180, 1000], [200, 1150],
    [225, 1250], [250, 1350], [280, 1550], [315, 1700], [355, 1900], [400, 2100], [450, 2400], [500, 2600]],
} satisfies Record<string, SizeTable<number | null>>

/**
 * Lower deviation ei (µm) of shaft k for grades IT4 to IT7.
 * Source: ISO 286-1:2010, shafts k to zc table, column "k, IT4 to IT7".
 * For grades up to IT3 and above IT7, and for all grades above 500 mm, ei = 0.
 * (Hole K is also derived from this column, see holeDeviations.ts.)
 */
export const K_IT4_TO_IT7_LOWER_DEVIATION_UM: SizeTable<number> = [
  [3, 0], [6, 1], [10, 1], [18, 1], [30, 2], [50, 2], [80, 2], [120, 3], [180, 3],
  [250, 4], [315, 4], [400, 4], [500, 5], [3150, 0],
]

/**
 * Lower deviation ei (µm) of shaft j, which exists only for the grades below.
 * Source: ISO 286-1:2010, shafts a to j table, columns "j, IT5 and IT6", "j, IT7", "j, IT8"
 * (j8 only up to 3 mm; no j above 500 mm).
 */
export const J_LOWER_DEVIATION_TABLES_UM = {
  'IT5 and IT6': [[3, -2], [6, -2], [10, -2], [18, -3], [30, -4], [50, -5], [80, -7], [120, -9],
    [180, -11], [250, -13], [315, -16], [400, -18], [500, -20]],
  IT7: [[3, -4], [6, -4], [10, -5], [18, -6], [30, -8], [50, -10], [80, -12], [120, -15], [180, -18],
    [250, -21], [315, -26], [400, -28], [500, -32]],
  IT8: [[3, -6]],
} satisfies Record<string, SizeTable<number>>

type UpperDeviationLetter = keyof typeof UPPER_DEVIATION_TABLES_UM

export function isUpperDeviationLetter(letter: DeviationLetter): letter is UpperDeviationLetter {
  return letter in UPPER_DEVIATION_TABLES_UM
}

function jTableForGrade(grade: ToleranceGrade): SizeTable<number> | undefined {
  switch (gradeNumber(grade)) {
    case 5:
    case 6:
      return J_LOWER_DEVIATION_TABLES_UM['IT5 and IT6']
    case 7:
      return J_LOWER_DEVIATION_TABLES_UM.IT7
    case 8:
      return J_LOWER_DEVIATION_TABLES_UM.IT8
    default:
      return undefined
  }
}

/** ei of shaft k (shafts k to zc table): the tabulated value for IT4 to IT7, otherwise 0. */
function kLowerDeviationUm(grade: ToleranceGrade, nominalMm: number): number {
  const grade4to7 = gradeNumber(grade) >= 4 && gradeNumber(grade) <= 7
  return grade4to7 ? (valueForSize(K_IT4_TO_IT7_LOWER_DEVIATION_UM, nominalMm) ?? 0) : 0
}

/**
 * Fundamental deviation of a shaft (every letter except js, which is
 * symmetric and handled with the tolerance zone).
 * a to h: upper deviation es. j to zc: lower deviation ei.
 */
export function shaftFundamentalDeviation(
  letter: Exclude<DeviationLetter, 'js'>,
  grade: ToleranceGrade,
  nominalMm: number,
): Result<FundamentalDeviation> {
  if (letter === 'k') {
    return ok({ limit: 'lower', valueUm: kLowerDeviationUm(grade, nominalMm) })
  }

  if (letter === 'j') {
    const table = jTableForGrade(grade)
    const valueUm = table && valueForSize(table, nominalMm)
    if (valueUm === undefined) {
      return fail(`j${grade} is not defined for a nominal size of ${nominalMm} mm: ${SOURCE.shaftsAtoJ} gives j only for j5, j6, j7 up to 500 mm and j8 up to 3 mm (use js instead).`)
    }
    return ok({ limit: 'lower', valueUm })
  }

  if (isUpperDeviationLetter(letter)) {
    return tabulatedDeviation(UPPER_DEVIATION_TABLES_UM[letter], 'upper', letter, grade, nominalMm)
  }
  return tabulatedDeviation(LOWER_DEVIATION_TABLES_UM[letter], 'lower', letter, grade, nominalMm)
}

function tabulatedDeviation(
  table: SizeTable<number | null>,
  limit: FundamentalDeviation['limit'],
  letter: DeviationLetter,
  grade: ToleranceGrade,
  nominalMm: number,
): Result<FundamentalDeviation> {
  const valueUm = valueForSize(table, nominalMm)
  if (valueUm === undefined || valueUm === null) {
    const source = limit === 'upper' ? SOURCE.shaftsAtoJ : SOURCE.shaftsKtoZC
    return fail(notTabulatedMessage(letter, grade, nominalMm, source))
  }
  return ok({ limit, valueUm })
}
