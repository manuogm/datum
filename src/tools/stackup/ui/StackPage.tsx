// Tolerance Stack-up tool, as guided steps from the requirement to the
// results. The first step chooses the mode, which names the second:
//   Part:     Requirement · Contributors · Method · Results
//   Assembly: Requirement · Parts        · Method · Results
// Both have four steps, so switching mode keeps the place.
//
// The page shows one calculation of the library. "Save" stores the inputs on
// screen (an assembly also records the part values it used); "Report" opens
// the printable report. A new calculation opens on its first step, any other
// on Results (useCalculationSteps).
import { useMemo, useState } from 'react'
import { AppLayout } from '../../../app/AppLayout'
import { useSettings } from '../../../app/settings/settings'
import { CalculationActions } from '../../../app/tools/CalculationActions'
import { useCalculationSteps } from '../../../app/tools/calculationSteps'
import { StepBar, useSessionState } from '../../../app/ui'
import type { Calculation } from '../../../core/library'
import type { ChartSource } from './charts/stackChart'
import { CHAIN_STEP, shownFault, stackSteps, stepFault, type StackStepId } from './logic/steps'
import { stackStatus } from './logic/stackResults'
import { useStackTool } from './state/useStackTool'
import { ChainStep } from './steps/ChainStep'
import { MethodStep } from './steps/MethodStep'
import { RequirementStep } from './steps/RequirementStep'
import { ResultsStep } from './steps/ResultsStep'
import type { FreshRows, RowSelection, StackStepProps } from './steps/stepProps'

export function StackPage({ calculation }: { calculation: Calculation }) {
  const { inputs, dispatch, results, library, canSave, save } = useStackTool(calculation)
  const { unitSystem: system } = useSettings()
  const selection = useRowSelection(calculation.id)
  const fresh = useFreshRows()
  const engineFault = stepFault(results.analysis)
  // The flow needs only the steps' ids; their marks depend on how far the user has gone.
  const flow = useCalculationSteps(calculation, stackSteps(inputs.mode, null))
  const fault = shownFault(engineFault, inputs, fresh.ids, flow.reached > CHAIN_STEP)
  const steps = stackSteps(inputs.mode, fault)
  const status = results.analysis.ok ? stackStatus(results.analysis.value, results.brokenLinks.length) : null
  const valid = useMemo(() => (results.analysis.ok ? { inputs, analysis: results.analysis.value, links: results.links } : null), [inputs, results])
  const lastValid = useLastValid(valid)
  const props: StackStepProps = {
    calculation, inputs, dispatch, results, library, system, flow, fault, engineFault, status, lastValid, selection, fresh,
  }
  return (
    <AppLayout current={{ tab: 'calc', id: calculation.id }} actions={<CalculationActions calculationId={calculation.id} unsaved={canSave} onSave={save} />}>
      <StepBar steps={steps} {...flow.bar} />
      <CurrentStep id={flow.step.id as StackStepId} props={props} />
    </AppLayout>
  )
}

function CurrentStep({ id, props }: { id: StackStepId; props: StackStepProps }) {
  switch (id) {
    case 'requirement':
      return <RequirementStep {...props} />
    case 'chain':
      return <ChainStep {...props} />
    case 'method':
      return <MethodStep {...props} />
    case 'results':
      return <ResultsStep {...props} />
  }
}

/** The selected row and the rows open to their details, remembered while the page is open (`stack:<calcId>/row`). */
function useRowSelection(calculationId: string): RowSelection {
  const [state, setState] = useSessionState<{ selected: string | null; expanded: readonly string[] }>(`stack:${calculationId}/row`, { selected: null, expanded: [] })
  return {
    ...state,
    select: (id) => {
      if (id !== state.selected) setState({ ...state, selected: id })
    },
    toggle: (id) =>
      setState({ selected: id, expanded: state.expanded.includes(id) ? state.expanded.filter((open) => open !== id) : [...state.expanded, id] }),
    open: (id) => setState({ selected: id, expanded: state.expanded.includes(id) ? state.expanded : [...state.expanded, id] }),
  }
}

/** Rows added on this page whose number fields have not been left yet (design §9.2, draft rule). */
function useFreshRows(): FreshRows {
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set())
  return {
    ids,
    add: (id) => setIds((current) => new Set(current).add(id)),
    touch: (id) =>
      setIds((current) => {
        if (!current.has(id)) return current
        const next = new Set(current)
        next.delete(id)
        return next
      }),
  }
}

/**
 * The last state of the chain the engine accepted: the chart keeps showing
 * it, dimmed, while a row is being fixed (design §5.2). Updated during
 * render when a new valid state comes (React's "adjust state on change").
 */
function useLastValid(valid: ChartSource | null): ChartSource | null {
  const [last, setLast] = useState<ChartSource | null>(valid)
  if (valid !== null && valid !== last) setLast(valid)
  return valid ?? last
}
