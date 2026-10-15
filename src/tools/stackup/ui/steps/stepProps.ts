// What every step of the Tolerance Stack-up tool is given.
import type { Dispatch } from 'react'
import type { StepFlow } from '../../../../app/ui'
import type { Calculation, CalculationStatus, Library } from '../../../../core/library'
import type { UnitSystem } from '../../../../core/units'
import type { ChartSource } from '../charts/stackChart'
import type { StackResults } from '../logic/stackResults'
import type { StepFault } from '../logic/steps'
import type { StackAction } from '../state/stackReducer'
import type { StackInputs } from '../state/stackInputs'

/** The row picked in the list or the chart, and the rows open to their details (remembered per calculation). */
export interface RowSelection {
  readonly selected: string | null
  readonly expanded: readonly string[]
  select: (id: string | null) => void
  /** Open or close a row's details. */
  toggle: (id: string) => void
  /** Select a row and open its details (a new geometric row, a click on a tolerance cell). */
  open: (id: string) => void
}

/** Rows just added and not left yet: their faults are held back (design §9.2, draft rule). */
export interface FreshRows {
  readonly ids: ReadonlySet<string>
  add: (id: string) => void
  /** A number field of the row was left: its faults show from now on. */
  touch: (id: string) => void
}

export interface StackStepProps {
  calculation: Calculation
  inputs: StackInputs
  dispatch: Dispatch<StackAction>
  results: StackResults
  library: Library
  system: UnitSystem
  flow: StepFlow
  /** The fault as shown (a fresh row's fault held back). */
  fault: StepFault | null
  /** The engine's fault, shown or not: what blocks Next. */
  engineFault: StepFault | null
  /** The status by the verdict method; null while the chain cannot be analysed. */
  status: CalculationStatus | null
  /** The last state of the chain the engine accepted, for the chart. */
  lastValid: ChartSource | null
  selection: RowSelection
  fresh: FreshRows
}
