// Calculator, step 1: the mode, the nominal size and the fit (an ISO
// preferred fit in one click; any hole and shaft class under More options).
// The zone diagram beside it follows the fit chosen. A fit ISO 286 does not
// define at this size shows the engine's explanation and blocks Next.
import { useState, type Dispatch } from 'react'
import { Callout, Chip, MoreOptions, PanelSection, SegmentedControl, StepPage } from '../../../../app/ui'
import type { Result } from '../../../../core/result'
import { unitOf } from '../../../../core/units'
import { formatFit, parseFitDesignation, type FitAnalysis, type FitType } from '../../calc'
import { isPreferredFit, preferredFitsOfType } from '../logic/preferredChips'
import { FIT_TYPE_LABEL, nominalLabel } from '../shared/labels'
import { ModeChoice } from '../shared/ModeChoice'
import { NominalSize } from '../shared/NominalSize'
import sharedStyles from '../shared/shared.module.css'
import { nextBlock, type FirstStepProps } from '../shared/stepProps'
import { ZoneDiagram } from '../shared/ZoneDiagram'
import type { FitInputs } from '../state/fitInputs'
import type { FitAction } from '../state/fitReducer'
import styles from './calculator.module.css'
import { ZonePicker } from './ZonePicker'

const FIT_TYPES = (Object.keys(FIT_TYPE_LABEL) as FitType[]).map((type) => ({ value: type, label: FIT_TYPE_LABEL[type] }))

export function SizeFitStep({ inputs, results, system, dispatch, flow, fault, onModeChange }: FirstStepProps) {
  const change = (changes: Partial<FitInputs>) => dispatch({ type: 'change', changes })
  const calculation = results.calculation
  const designation = formatFit({ hole: inputs.hole, shaft: inputs.shaft })
  return (
    <StepPage
      {...flow.page}
      {...nextBlock(fault, 'fit')}
      className={sharedStyles.step}
      title="Size and fit"
      hint="The nominal diameter, then a preferred ISO fit. Any other hole and shaft class is under More options."
      aside={
        calculation.ok ? (
          <div className={styles.diagramArea}>
            <ZoneDiagram fit={calculation.value} system={system} variant="screen" />
          </div>
        ) : (
          <Callout status="bad" title="No zones for this fit">
            Choose a fit that ISO 286 defines at this size.
          </Callout>
        )
      }
      asideLabel="Tolerance zones"
      asideMeta={`${nominalLabel(inputs.nominalMm, system)} ${designation} · to scale · ${unitOf('deviation', system)}`}
    >
      <ModeChoice mode={inputs.mode} onChange={onModeChange} />

      <PanelSection label="Size">
        <NominalSize nominalMm={inputs.nominalMm} system={system} onChange={(nominalMm) => change({ nominalMm })} />
      </PanelSection>

      <PanelSection label="Fit">
        <PreferredFits inputs={inputs} calculation={calculation} dispatch={dispatch} />
        {!calculation.ok && (
          <Callout status="bad" title="Not defined by ISO 286">
            {calculation.error}
          </Callout>
        )}
      </PanelSection>

      {/* A fit outside the preferred list counts as one change, so the closed row shows it was set by hand. */}
      <MoreOptions label="Any hole and shaft class" count={2} changed={isPreferredFit(designation) ? 0 : 1} memoryKey="fit-zones">
        <PanelSection>
          <div className={styles.zones}>
            <ZonePicker zone={inputs.hole} onChange={(hole) => change({ hole })} />
            <ZonePicker zone={inputs.shaft} onChange={(shaft) => change({ shaft })} />
          </div>
        </PanelSection>
      </MoreOptions>
    </StepPage>
  )
}

interface PreferredFitsProps {
  inputs: FitInputs
  calculation: Result<FitAnalysis>
  dispatch: Dispatch<FitAction>
}

/** Fit type filter and the ISO preferred fits of that type, as one-click chips. */
function PreferredFits({ inputs, calculation, dispatch }: PreferredFitsProps) {
  const [fitType, setFitType] = useState<FitType>(calculation.ok ? calculation.value.fitType : 'clearance')
  const current = formatFit({ hole: inputs.hole, shaft: inputs.shaft })
  return (
    <>
      <SegmentedControl label="Fit type" options={FIT_TYPES} value={fitType} onChange={setFitType} fill />
      <div className={styles.chips}>
        {preferredFitsOfType(inputs.nominalMm, fitType).map(({ designation, name }) => (
          <span key={designation} title={name}>
            <Chip
              mono
              selected={designation === current}
              onClick={() => {
                const fit = parseFitDesignation(designation)
                if (fit.ok) dispatch({ type: 'applyFit', fit: fit.value })
              }}
            >
              {designation}
            </Chip>
          </span>
        ))}
      </div>
    </>
  )
}
