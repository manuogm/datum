// What every step of the Composite Laminate tool gets from the page.
import type { Dispatch } from 'react'
import type { StepFlow } from '../../../../app/ui'
import type { Result } from '../../../../core/result'
import type { UnitSystem } from '../../../../core/units'
import type { LaminateAnalysis } from '../../calc'
import type { StepFault } from '../logic/steps'
import type { LaminateInputs } from '../state/lamInputs'
import type { LamAction } from '../state/lamReducer'

export interface LamStepProps {
  inputs: LaminateInputs
  /** The CLT analysis of the inputs, in SI. */
  analysis: Result<LaminateAnalysis>
  dispatch: Dispatch<LamAction>
  system: UnitSystem
  flow: StepFlow
  /** The step whose inputs the engine rejects, if any. */
  fault: StepFault | null
  /** The ply highlighted in the ply list, the stack and the ply failure list (1 = top). */
  selectedPly: number | null
  onSelectPly: (index: number) => void
}
