// The engine's explanation on the step whose inputs it rejects.
import { Callout, PanelSection } from '../../../../app/ui'
import type { StepFault } from '../logic/fitSteps'

export function FaultCallout({ fault, step, title }: { fault: StepFault | null; step: StepFault['step']; title: string }) {
  if (fault?.step !== step) return null
  return (
    <PanelSection>
      <Callout status="bad" title={title}>
        {fault.error}
      </Callout>
    </PanelSection>
  )
}
