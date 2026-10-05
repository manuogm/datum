// How the Fit Tolerance inputs change. Every edit on the screen is one of
// these actions; the reducer is pure so it can be tested on its own.
import type { ApplicationFunction } from '../../advisor'
import type { FitSpec } from '../../calc'
import type { FitInputs } from './fitInputs'

export type FitAction =
  /** Plain edits of one or more fields (a material, the nominal size, a temperature …). */
  | { type: 'change'; changes: Partial<FitInputs> }
  /** Switch an application function chip on or off. */
  | { type: 'toggleFunction'; fn: ApplicationFunction }
  /** Take a fit (e.g. the advisor's best match) into the calculator and show it there. */
  | { type: 'applyFit'; fit: FitSpec }

export function fitReducer(inputs: FitInputs, action: FitAction): FitInputs {
  switch (action.type) {
    case 'change':
      return { ...inputs, ...action.changes }
    case 'toggleFunction': {
      const has = inputs.functions.includes(action.fn)
      const functions = has ? inputs.functions.filter((fn) => fn !== action.fn) : [...inputs.functions, action.fn]
      return { ...inputs, functions }
    }
    case 'applyFit':
      return { ...inputs, mode: 'calculator', hole: action.fit.hole, shaft: action.fit.shaft }
  }
}
