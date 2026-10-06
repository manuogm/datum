// useStepFlow: the step state of a guided tool (see stepFlow.ts) as a React
// hook. Give it the tool's steps and, to keep the place while the page is
// open, a memory key such as the calculation id.
//
//   const flow = useStepFlow(STEPS, { memoryKey: `fit:${calc.id}` })
//   <StepBar steps={STEPS} {...flow.bar} />
//   <StepPage {...flow.page} title="Geometry" hint="…">…</StepPage>
import { useCallback, useState } from 'react'
import { recall, remember } from './sessionMemory'
import {
  INITIAL_STEP_FLOW, fitStepFlow, stepFlowReducer, stepIndex, stepStatus, type StepDef, type StepFlowAction, type StepFlowState,
  type StepStatus,
} from './stepFlow'

interface StepFlowOptions {
  /** Remember the place under this key while the page is open. */
  memoryKey?: string
  /** Where a flow with nothing remembered starts, e.g. a reopened calculation on its results. */
  initial?: StepFlowState
}

export interface StepFlow {
  /** Index of the step on screen. */
  index: number
  /** The step on screen. */
  step: StepDef
  isFirst: boolean
  isLast: boolean
  /** Furthest step reached. */
  reached: number
  /** True once the user has moved between steps (focus the new step's title then). */
  navigated: boolean
  next: () => void
  back: () => void
  /** Go to a reached step (or the next one) by index or id. */
  goTo: (target: number | string) => void
  reset: () => void
  /** Open every step and show `target` (default: the last). */
  reachAll: (target?: number | string) => void
  status: (index: number) => StepStatus
  /** Props for StepBar (besides steps). */
  bar: { current: number; reached: number; onSelect: (index: number) => void }
  /** Footer props for StepPage. */
  page: { onBack?: () => void; onNext?: () => void; focusTitle: boolean; stepNumber: number; stepCount: number }
}

export function useStepFlow(steps: readonly StepDef[], { memoryKey, initial = INITIAL_STEP_FLOW }: StepFlowOptions = {}): StepFlow {
  const key = memoryKey === undefined ? undefined : `steps:${memoryKey}`
  const [stored, setStored] = useState<StepFlowState>(() => (key === undefined ? initial : recall(key, initial)))
  const [navigated, setNavigated] = useState(false)
  const count = steps.length
  const state = fitStepFlow(stored, count)

  const dispatch = useCallback(
    (action: StepFlowAction) => {
      setStored((previous) => {
        const next = stepFlowReducer(previous, action, count)
        if (key !== undefined) remember(key, next)
        return next
      })
      setNavigated(true)
    },
    [count, key],
  )
  const resolve = (target: number | string) => (typeof target === 'number' ? target : stepIndex(steps, target))
  const next = () => dispatch({ type: 'next' })
  const back = () => dispatch({ type: 'back' })
  const goTo = (target: number | string) => dispatch({ type: 'goTo', index: resolve(target) })
  const isFirst = state.current === 0
  const isLast = state.current >= count - 1
  return {
    index: state.current,
    step: steps[state.current],
    isFirst,
    isLast,
    reached: state.reached,
    navigated,
    next,
    back,
    goTo,
    reset: () => dispatch({ type: 'reset' }),
    reachAll: (target?: number | string) => dispatch({ type: 'reachAll', index: target === undefined ? undefined : resolve(target) }),
    status: (index: number) => stepStatus(state, index),
    bar: { current: state.current, reached: state.reached, onSelect: goTo },
    page: {
      onBack: isFirst ? undefined : back,
      onNext: isLast ? undefined : next,
      focusTitle: navigated,
      stepNumber: state.current + 1,
      stepCount: count,
    },
  }
}
