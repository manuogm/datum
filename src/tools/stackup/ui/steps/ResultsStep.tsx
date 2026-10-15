// Step 4 · Results, in three depths the engineer opens on purpose:
//   1. the verdict: the result range by the chosen method against the
//      requirement, with the other method, the capability and the largest
//      contributor (or, in an assembly, the dominant part);
//   2. details: the stack chart, the linked parts, the contributions and
//      both methods side by side;
//   3. calculation: the equations, every row's conversion and source, the
//      assumptions and the sources.
// When the engine rejects the chain, the verdict is its explanation with a
// way back to the step to fix.
import { ProblemCallout, ResultsLayout, StepPage } from '../../../../app/ui'
import { FAULT_TITLE, resultsHint, stepLabel } from '../logic/steps'
import { ResultsCalculation } from '../results/ResultsCalculation'
import { ResultsDetails } from '../results/ResultsDetails'
import { StackVerdict } from '../results/StackVerdict'
import type { StackStepProps } from './stepProps'

export function ResultsStep({ calculation, inputs, results, system, flow, engineFault, status }: StackStepProps) {
  if (!results.analysis.ok) {
    const step = engineFault?.step ?? 'chain'
    return (
      <StepPage {...flow.page} title="Results" wide>
        <ResultsLayout
          verdict={
            <ProblemCallout title={FAULT_TITLE} back={{ label: stepLabel(step, inputs.mode), onClick: () => flow.goTo(step) }}>
              {results.analysis.error}
            </ProblemCallout>
          }
        />
      </StepPage>
    )
  }
  const analysis = results.analysis.value
  return (
    <StepPage {...flow.page} title="Results" hint={resultsHint(inputs, analysis)} wide>
      <ResultsLayout
        memoryKey={flow.memoryKey}
        verdict={<StackVerdict inputs={inputs} results={results} analysis={analysis} system={system} />}
        detailsSummary="Stack chart · contributions · worst case and RSS side by side"
        details={<ResultsDetails calculationId={calculation.id} inputs={inputs} results={results} analysis={analysis} system={system} status={status ?? 'none'} />}
        calculationSummary="Equations · each row's conversion and source · assumptions"
        calculation={<ResultsCalculation inputs={inputs} results={results} analysis={analysis} system={system} />}
      />
    </StepPage>
  )
}
