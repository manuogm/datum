// The laminate stiffness as the screens and report show it: the A, B and D
// matrices in the viewer's units, the couplings they reveal, and the
// effective engineering constants of the laminate as a plate.
import { formatDecimal, formatQuantity, unitOf, type Quantity, type UnitSystem } from '../../../../core/units'
import type { Coupling, EngineeringConstants, Matrix3, Stiffness } from '../../calc'

export interface MatrixView {
  readonly symbol: 'A' | 'B' | 'D'
  readonly unit: string
  readonly rows: readonly (readonly string[])[]
}

const view = (symbol: MatrixView['symbol'], quantity: Quantity, matrix: Matrix3, system: UnitSystem): MatrixView => ({
  symbol,
  unit: unitOf(quantity, system),
  rows: matrix.map((row) => row.map((value) => formatQuantity(quantity, system, value))),
})

/** A (N/mm) as a stiffness, B (N) as a force, D (N·mm) as a bending stiffness. */
export function abdMatrices(stiffness: Stiffness, system: UnitSystem): MatrixView[] {
  return [
    view('A', 'stiffness', stiffness.aNPerMm, system),
    view('B', 'force', stiffness.bN, system),
    view('D', 'bendingStiffness', stiffness.dNmm, system),
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
}

export const COUPLING_FLAGS: readonly CouplingFlag[] = [
  { key: 'bendingExtension', label: 'Bending–extension', absent: 'B = 0', present: 'B ≠ 0', effect: 'in-plane loads bend and twist it; it warps on cure' },
  { key: 'shearExtension', label: 'Shear–extension', absent: 'A16 = A26 = 0', present: 'A16, A26 ≠ 0', effect: 'tension or compression shears it' },
  { key: 'bendTwist', label: 'Bend–twist', absent: 'D16 = D26 = 0', present: 'D16, D26 ≠ 0', effect: 'bending moments twist it' },
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
