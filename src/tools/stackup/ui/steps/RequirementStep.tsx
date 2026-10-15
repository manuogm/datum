// Step 1 · Requirement: the mode (Part or Assembly), what the stack adds up
// to and the limits it must stay within. The drawing standard and the names
// of the loop's two ends are under More options. A Part stack that
// assemblies link says so: saving it moves those assemblies.
import { useState } from 'react'
import { calcHref } from '../../../../app/router/routes'
import { Button, Dialog, Field, MonoLabel, MoreOptions, PanelSection, SegmentedControl, StepPage } from '../../../../app/ui'
import { countOf } from '../../../../app/format/count'
import { STANDARD_NAME } from '../gdt/characteristics'
import { requirementOptionsChanged, stepProblem } from '../logic/steps'
import { LengthInput } from '../editor/LengthInput'
import { assembliesLinking } from '../state/linkedParts'
import type { StackAction } from '../state/stackReducer'
import type { StackMode } from '../state/stackInputs'
import type { StackStepProps } from './stepProps'
import styles from './steps.module.css'

const MODES = [
  { value: 'part', label: 'Part' },
  { value: 'assembly', label: 'Assembly' },
] as const

const MODE_NOTE: Record<StackMode, string> = {
  part: 'One dimension on one part, through its features.',
  assembly: 'A gap through several parts, using their part stacks.',
}

const STANDARDS = [
  { value: 'iso', label: STANDARD_NAME.iso },
  { value: 'asme', label: STANDARD_NAME.asme },
] as const

const HINT: Record<StackMode, string> = {
  part: 'The part, the dimension the stack adds up to, and the limits it must stay within. Leave a limit empty when there is none. The drawing standard is under More options.',
  assembly: 'The gap or dimension across the assembly, and the limits it must stay within. Leave a limit empty when there is none. The drawing standard is under More options.',
}

export function RequirementStep({ calculation, inputs, dispatch, library, system, flow, fault, engineFault }: StackStepProps) {
  const [confirm, setConfirm] = useState<StackMode | null>(null)
  const usedIn = assembliesLinking(library, [calculation.id])
  const linkedRows = inputs.rows.filter((row) => row.kind === 'linked').length
  const switchMode = (mode: StackMode) => {
    if (mode === inputs.mode) return
    // Leaving Assembly drops the linked rows; leaving Part breaks the assemblies that link this part.
    const asks = mode === 'part' ? linkedRows > 0 : usedIn.length > 0
    if (asks) setConfirm(mode)
    else dispatch({ type: 'mode', mode })
  }
  const change = (changes: Extract<StackAction, { type: 'change' }>['changes']) => dispatch({ type: 'change', changes })
  const requirementFault = engineFault?.step === 'requirement'
  return (
    <StepPage
      {...flow.page}
      problem={stepProblem(fault, 'requirement')}
      nextDisabled={requirementFault}
      nextNote={requirementFault ? engineFault?.error : undefined}
      title="Requirement"
      hint={HINT[inputs.mode]}
    >
      <PanelSection label="Mode">
        <SegmentedControl label="Mode" size="md" options={MODES} value={inputs.mode} onChange={switchMode} />
        <span className={styles.note}>{MODE_NOTE[inputs.mode]}</span>
      </PanelSection>

      {inputs.mode === 'part' && (
        <PanelSection label="Part">
          <Field aria-label="Part" size="md" placeholder="e.g. Housing" value={inputs.partName} onChange={(event) => change({ partName: event.target.value })} />
          {usedIn.length > 0 && (
            <span className={styles.usedIn}>
              <MonoLabel size="xs" tone="faint">
                Used in
              </MonoLabel>
              {usedIn.map((assembly, i) => (
                <span key={assembly.id}>
                  {i > 0 && ', '}
                  <a href={calcHref(assembly.id)} className={styles.usedInLink}>
                    {assembly.name} ↗
                  </a>
                </span>
              ))}
            </span>
          )}
        </PanelSection>
      )}

      <PanelSection label="Result">
        <Field
          aria-label="Result"
          size="md"
          placeholder={inputs.mode === 'part' ? 'e.g. Shoulder to circlip groove' : 'e.g. Bearing end play'}
          value={inputs.resultName}
          onChange={(event) => change({ resultName: event.target.value })}
        />
      </PanelSection>

      <PanelSection label="Requirement">
        <div className={styles.limits}>
          <LengthInput
            size="md"
            prefix="min"
            aria-label="Smallest allowed result"
            placeholder="none"
            showUnit
            system={system}
            value={inputs.requirement.min}
            invalid={requirementFault}
            onChange={(min) => change({ requirement: { ...inputs.requirement, min } })}
          />
          <LengthInput
            size="md"
            prefix="max"
            aria-label="Largest allowed result"
            placeholder="none"
            showUnit
            system={system}
            value={inputs.requirement.max}
            invalid={requirementFault}
            onChange={(max) => change({ requirement: { ...inputs.requirement, max } })}
          />
        </div>
      </PanelSection>

      <MoreOptions count={3} changed={requirementOptionsChanged(inputs)} memoryKey="stack:requirement">
        <PanelSection label="Drawing standard">
          <SegmentedControl label="Drawing standard" size="sm" options={STANDARDS} value={inputs.standard} onChange={(standard) => change({ standard })} />
          <span className={styles.note}>It changes the wording of the geometric tolerances and the modifiers they take, not the arithmetic.</span>
        </PanelSection>
        <PanelSection label="Ends of the loop">
          <div className={styles.limits}>
            <Field size="md" aria-label="Start label" prefix="start" placeholder="e.g. face A" value={inputs.startLabel} onChange={(event) => change({ startLabel: event.target.value })} />
            <Field size="md" aria-label="End label" prefix="end" placeholder="e.g. circlip flank" value={inputs.endLabel} onChange={(event) => change({ endLabel: event.target.value })} />
          </div>
        </PanelSection>
      </MoreOptions>

      {confirm && (
        <Dialog
          title={confirm === 'part' ? 'Switch to Part?' : 'Switch to Assembly?'}
          onClose={() => setConfirm(null)}
          footer={
            <>
              <Button variant="ghost" size="md" onClick={() => setConfirm(null)} data-autofocus>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  dispatch({ type: 'mode', mode: confirm })
                  setConfirm(null)
                }}
              >
                Switch
              </Button>
            </>
          }
        >
          <p className={styles.dialogText}>
            {confirm === 'part'
              ? `The ${countOf(linkedRows, 'linked part stack is', 'linked part stacks are')} removed; the ${countOf(inputs.rows.length - linkedRows, 'other row stays', 'other rows stay')}.`
              : `${usedIn.map((c) => c.name).join(', ')} ${usedIn.length === 1 ? 'links' : 'link'} this part stack. ${usedIn.length === 1 ? 'It' : 'They'} will keep the last saved values and show the link as not a part stack.`}
          </p>
        </Dialog>
      )}
    </StepPage>
  )
}
