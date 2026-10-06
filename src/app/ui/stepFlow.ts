// Step state of a guided tool: which step is on screen and how far the user
// has got. A step is "done" once the user has moved past it (any step up to
// the furthest one reached), and only done steps, the current one and the
// next one can be gone to. Pure functions: useStepFlow wraps them in React state.

/** One step of a guided tool, as the step bar shows it. */
export interface StepDef {
  /** Stable id, e.g. 'geometry', 'results'. */
  readonly id: string
  /** Short name in the bar, e.g. 'Geometry'. */
  readonly label: string
  /**
   * Marks the step as needing attention (an input the engine rejects). true
   * shows the mark; a string also explains it (tooltip and screen readers).
   */
  readonly invalid?: boolean | string
}

export type StepStatus = 'done' | 'current' | 'upcoming'

export interface StepFlowState {
  /** Index of the step on screen. */
  readonly current: number
  /** Index of the furthest step the user has reached. */
  readonly reached: number
}

export type StepFlowAction =
  | { readonly type: 'next' }
  | { readonly type: 'back' }
  | { readonly type: 'goTo'; readonly index: number }
  /** Start over at the first step, nothing reached. */
  | { readonly type: 'reset' }
  /** Open every step at once, e.g. a saved calculation reopened on its results. */
  | { readonly type: 'reachAll'; readonly index?: number }

export const INITIAL_STEP_FLOW: StepFlowState = { current: 0, reached: 0 }

const clamp = (value: number, max: number) => Math.min(Math.max(0, Math.round(value)), Math.max(0, max))

/** A state that fits a flow of `count` steps (steps can change with the tool's mode). */
export function fitStepFlow(state: StepFlowState, count: number): StepFlowState {
  const last = Math.max(0, count - 1)
  const reached = clamp(state.reached, last)
  const current = clamp(state.current, reached)
  return current === state.current && reached === state.reached ? state : { current, reached }
}

/** Whether the user may go to step `index`: any reached step, or the one after the furthest reached. */
export function canGoToStep(state: StepFlowState, index: number, count: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < count && index <= state.reached + 1
}

export function stepFlowReducer(state: StepFlowState, action: StepFlowAction, count: number): StepFlowState {
  const fitted = fitStepFlow(state, count)
  const last = Math.max(0, count - 1)
  const go = (index: number): StepFlowState =>
    canGoToStep(fitted, index, count) ? { current: index, reached: Math.max(fitted.reached, index) } : fitted
  switch (action.type) {
    case 'next':
      return go(fitted.current + 1)
    case 'back':
      return go(fitted.current - 1)
    case 'goTo':
      return go(action.index)
    case 'reset':
      return INITIAL_STEP_FLOW
    case 'reachAll':
      return { current: clamp(action.index ?? last, last), reached: last }
  }
}

/** How the step bar shows step `index`. */
export function stepStatus(state: StepFlowState, index: number): StepStatus {
  if (index === state.current) return 'current'
  return index <= state.reached ? 'done' : 'upcoming'
}

/** Index of the step with this id, or -1. */
export function stepIndex(steps: readonly StepDef[], id: string): number {
  return steps.findIndex((step) => step.id === id)
}
