// Step 2 · Loads: the in-plane running loads Nx, Ny, Nxy per unit width. The
// moments Mx, My, Mxy (a plate in bending) are under More options, with the
// sign convention; the closed row says how many are applied.
import { MoreOptions, PanelSection, StepPage } from '../../../../app/ui'
import { LoadsFields } from '../editor/LoadsFields'
import { appliedLoadsText } from '../logic/loads'
import { appliedMoments } from '../logic/steps'
import type { LoadSpec } from '../state/lamInputs'
import type { LamStepProps } from './stepProps'
import styles from './steps.module.css'

export function LoadsStep({ inputs, dispatch, system, flow }: LamStepProps) {
  const change = (changes: Partial<LoadSpec>) => dispatch({ type: 'loads', changes })
  const unloaded = appliedLoadsText(inputs.loads, system) === ''
  return (
    <StepPage
      {...flow.page}
      className={styles.step}
      title="Loads"
      hint="The running loads the laminate carries, per unit width. Leave a load at 0 when it is not applied."
      nextNote={unloaded ? 'No load applied: nothing to check yet' : undefined}
    >
      <PanelSection label="In-plane forces">
        <LoadsFields quantity="lineLoad" loads={inputs.loads} system={system} onChange={change} />
      </PanelSection>
      <MoreOptions label="Moments" count={3} changed={appliedMoments(inputs.loads)} memoryKey="lam:moments">
        <PanelSection label="Bending and twisting moments">
          <LoadsFields quantity="lineMoment" loads={inputs.loads} system={system} onChange={change} />
          <span className={styles.note}>A positive Mx stretches the top ply; z is measured up from the mid-plane.</span>
        </PanelSection>
      </MoreOptions>
    </StepPage>
  )
}
