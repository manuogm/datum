// Advisor, step 1: the mode, and what the fit is for (a preset application,
// or the function chips directly). The advisor's rules work from the chips.
import { Chip, PanelSection, Select, StepPage } from '../../../../app/ui'
import { APPLICATION_FUNCTIONS, APPLICATIONS, CUSTOM_APPLICATION, FUNCTION_LABELS, applicationOf } from '../logic/applications'
import { ModeChoice } from '../shared/ModeChoice'
import type { FirstStepProps } from '../shared/stepProps'
import styles from './advisor.module.css'

export function ApplicationStep({ inputs, dispatch, flow, onModeChange }: FirstStepProps) {
  const application = applicationOf(inputs.functions)
  const applications = application === CUSTOM_APPLICATION ? [...APPLICATIONS, CUSTOM_APPLICATION] : APPLICATIONS
  return (
    <StepPage
      {...flow.page}
      title="Application"
      hint="What the fit is for: the closest application, or the functions it must serve."
    >
      <ModeChoice mode={inputs.mode} onChange={onModeChange} />

      <PanelSection label="Application">
        <Select
          size="md"
          aria-label="Application"
          options={applications.map(({ id, label }) => ({ value: id, label }))}
          value={application.id}
          onChange={(id) => dispatch({ type: 'change', changes: { functions: applications.find((a) => a.id === id)?.functions ?? inputs.functions } })}
        />
        <div className={styles.chips}>
          {APPLICATION_FUNCTIONS.map((fn) => (
            <Chip key={fn} selected={inputs.functions.includes(fn)} onClick={() => dispatch({ type: 'toggleFunction', fn })}>
              {FUNCTION_LABELS[fn]}
            </Chip>
          ))}
        </div>
      </PanelSection>
    </StepPage>
  )
}
