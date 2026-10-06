// The six running loads of a laminate, in the order the inputs and the
// report list them, and which of them the first-ply failure load is quoted in.
import type { LaminateLoads } from '../../calc'

export interface LoadComponent {
  readonly key: keyof LaminateLoads
  /** 'Nx', 'Mxy' */
  readonly symbol: string
  readonly quantity: 'lineLoad' | 'lineMoment'
}

export const LOAD_COMPONENTS: readonly LoadComponent[] = [
  { key: 'nxNPerMm', symbol: 'Nx', quantity: 'lineLoad' },
  { key: 'nyNPerMm', symbol: 'Ny', quantity: 'lineLoad' },
  { key: 'nxyNPerMm', symbol: 'Nxy', quantity: 'lineLoad' },
  { key: 'mxN', symbol: 'Mx', quantity: 'lineMoment' },
  { key: 'myN', symbol: 'My', quantity: 'lineMoment' },
  { key: 'mxyN', symbol: 'Mxy', quantity: 'lineMoment' },
]

/** The applied load the failure load is quoted in: the largest force, else the largest moment; null with no load. */
export function leadingLoad(loads: Required<LaminateLoads>): LoadComponent | null {
  const largest = (quantity: LoadComponent['quantity']) =>
    LOAD_COMPONENTS.filter((c) => c.quantity === quantity && loads[c.key] !== 0)
      .reduce<LoadComponent | null>((best, c) => (best === null || Math.abs(loads[c.key]) > Math.abs(loads[best.key]) ? c : best), null)
  return largest('lineLoad') ?? largest('lineMoment')
}
