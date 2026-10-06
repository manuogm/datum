// The laminate stiffness as the screens and report show it: the A, B and D
// matrices in the viewer's units, the couplings they reveal, and the
// effective engineering constants of the laminate as a plate.
import { formatDecimal, formatQuantity, toDisplay, unitOf, type Quantity, type UnitSystem } from '../../../../core/units'
import { COUPLING_TOLERANCE, type Coupling, type EngineeringConstants, type Matrix3, type Stiffness } from '../../calc'

export interface MatrixView {
  readonly symbol: 'A' | 'B' | 'D'
  readonly unit: string
  readonly rows: readonly (readonly string[])[]
}

/** Matrix terms are shown to this many significant figures, so a small coupling term never rounds to 0. */
const SIGNIFICANT_FIGURES = 3
/** Below 10^−MAX_DECIMALS of the display unit a term is written in powers of ten. */
const MAX_DECIMALS = 6

/**
 * One matrix term in the display unit: '0' when the engine counts it as zero
 * (at or below `zeroBelowSi`, the COUPLING_TOLERANCE share of the matching
 * main terms), otherwise to three significant figures: '57.3', '0.0123',
 * '4.20e−7'.
 */
export function formatTerm(quantity: Quantity, system: UnitSystem, valueSi: number, zeroBelowSi: number): string {
  if (Math.abs(valueSi) <= zeroBelowSi) return '0'
  const value = toDisplay(quantity, system, valueSi)
  const magnitude = Math.floor(Math.log10(Math.abs(value)))
  const decimals = Math.max(0, SIGNIFICANT_FIGURES - 1 - magnitude)
  if (decimals <= MAX_DECIMALS) return formatDecimal(value, decimals, true)
  const [mantissa, exponent] = Math.abs(value).toExponential(SIGNIFICANT_FIGURES - 1).split('e')
  return `${value < 0 ? '−' : ''}${mantissa}e${exponent.replace('-', '−')}`
}

const largest = (matrix: Matrix3) => Math.max(...matrix.flat().map(Math.abs))

const view = (symbol: MatrixView['symbol'], quantity: Quantity, matrix: Matrix3, zeroBelowSi: number, system: UnitSystem): MatrixView => ({
  symbol,
  unit: unitOf(quantity, system),
  rows: matrix.map((row) => row.map((value) => formatTerm(quantity, system, value, zeroBelowSi))),
})

/** A (N/mm) as a stiffness, B (N) as a force, D (N·mm) as a bending stiffness; zero as the engine's coupling flags count it. */
export function abdMatrices(stiffness: Stiffness, thicknessMm: number, system: UnitSystem): MatrixView[] {
  const aScale = largest(stiffness.aNPerMm)
  return [
    view('A', 'stiffness', stiffness.aNPerMm, COUPLING_TOLERANCE * aScale, system),
    view('B', 'force', stiffness.bN, COUPLING_TOLERANCE * aScale * thicknessMm, system),
    view('D', 'bendingStiffness', stiffness.dNmm, COUPLING_TOLERANCE * largest(stiffness.dNmm), system),
  ]
}

export interface CouplingFlag {
  readonly key: keyof Coupling
  readonly label: string
  /** What the matrices show when the coupling is absent, and when present. */
  readonly absent: string
  readonly present: string
  /** What the coupling does to the part. */
  readonly effect: string
  /**
   * Whether its presence is a warning. B ≠ 0 and A16, A26 ≠ 0 come from an
   * unsymmetric or unbalanced stack, which the design rules avoid. D16, D26 ≠ 0
   * is in every balanced laminate with ±θ plies apart from the mid-plane
   * (a standard quasi-isotropic [0/±45/90]s has it), so it is shown as a fact.
   */
  readonly warns: boolean
}

export const COUPLING_FLAGS: readonly CouplingFlag[] = [
  { key: 'bendingExtension', label: 'Bending–extension', absent: 'B = 0', present: 'B ≠ 0', effect: 'in-plane loads bend and twist it; it warps on cure', warns: true },
  { key: 'shearExtension', label: 'Shear–extension', absent: 'A16 = A26 = 0', present: 'A16, A26 ≠ 0', effect: 'tension or compression shears it', warns: true },
  { key: 'bendTwist', label: 'Bend–twist', absent: 'D16 = D26 = 0', present: 'D16, D26 ≠ 0', effect: 'bending moments twist it', warns: false },
]

export interface ConstantView {
  /** 'Ex', 'νxy', 'Ex,f' */
  readonly symbol: string
  readonly label: string
  readonly value: string
  readonly unit: string
}

export function constantViews(c: EngineeringConstants, system: UnitSystem): ConstantView[] {
  const modulus = (symbol: string, label: string, gpa: number): ConstantView => ({
    symbol, label, value: formatQuantity('modulus', system, gpa), unit: unitOf('modulus', system),
  })
  const ratio = (symbol: string, label: string, value: number): ConstantView => ({ symbol, label, value: formatDecimal(value, 3, true), unit: '' })
  return [
    modulus('Ex', 'In-plane modulus, x', c.exGPa),
    modulus('Ey', 'In-plane modulus, y', c.eyGPa),
    modulus('Gxy', 'In-plane shear modulus', c.gxyGPa),
    ratio('νxy', "Poisson's ratio", c.nuXy),
    ratio('νyx', "Poisson's ratio", c.nuYx),
    modulus('Ex,f', 'Flexural modulus, x', c.flexuralExGPa),
    modulus('Ey,f', 'Flexural modulus, y', c.flexuralEyGPa),
  ]
}
