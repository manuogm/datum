// Calculator mode, left column: nominal size, the fit (a preferred fit or any
// hole and shaft class) and the service conditions used for the in-service
// check. An undefined combination shows the engine's explanation here.
import { useState, type Dispatch } from 'react'
import { Callout, Chip, PanelSection, QuantityField, RangeInputRow, SegmentedControl, Slider } from '../../../../app/ui'
import type { Result } from '../../../../core/result'
import { formatDecimal, formatQuantity, toDisplay, type UnitSystem } from '../../../../core/units'
import { formatFit, nominalSizeRange, parseFitDesignation, type FitAnalysis, type FitType } from '../../calc'
import type { FitResults } from '../logic/fitResults'
import { preferredFitsOfType } from '../logic/preferredChips'
import { SLIDER_STEPS, SLIDER_TICKS, sliderPosition, sliderSizeMm, tickPercent } from '../logic/sizeSlider'
import { FIT_TYPE_LABEL } from '../shared/labels'
import { MaterialPair } from '../shared/MaterialPair'
import sharedStyles from '../shared/shared.module.css'
import type { FitInputs } from '../state/fitInputs'
import type { FitAction } from '../state/fitReducer'
import styles from './calculator.module.css'
import { ZonePicker } from './ZonePicker'

const FIT_TYPES = (Object.keys(FIT_TYPE_LABEL) as FitType[]).map((type) => ({ value: type, label: FIT_TYPE_LABEL[type] }))

interface CalculatorInputsProps {
  inputs: FitInputs
  results: FitResults
  system: UnitSystem
  dispatch: Dispatch<FitAction>
}

export function CalculatorInputs({ inputs, results, system, dispatch }: CalculatorInputsProps) {
  const change = (changes: Partial<FitInputs>) => dispatch({ type: 'change', changes })
  return (
    <>
      <PanelSection label="Geometry">
        <NominalSize nominalMm={inputs.nominalMm} system={system} onChange={(nominalMm) => change({ nominalMm })} />
      </PanelSection>

      <PanelSection label="Fit">
        <PreferredFits inputs={inputs} calculation={results.calculation} dispatch={dispatch} />
        <div className={styles.zones}>
          <ZonePicker zone={inputs.hole} onChange={(hole) => change({ hole })} />
          <ZonePicker zone={inputs.shaft} onChange={(shaft) => change({ shaft })} />
        </div>
        {!results.calculation.ok && (
          <Callout status="bad" title="Not defined by ISO 286">
            {results.calculation.error}
          </Callout>
        )}
      </PanelSection>

      <PanelSection label="Service conditions">
        <MaterialPair
          housing={results.housing}
          shaft={results.shaft}
          system={system}
          onHousingChange={(housingMaterialId) => change({ housingMaterialId })}
          onShaftChange={(shaftMaterialId) => change({ shaftMaterialId })}
        />
        <div className={sharedStyles.rows}>
          <RangeInputRow
            label="Service temp."
            quantity="temperature"
            system={system}
            min={inputs.serviceTempC.minC}
            max={inputs.serviceTempC.maxC}
            onChange={(minC, maxC) => change({ serviceTempC: { minC, maxC } })}
          />
          <RangeInputRow
            label="Clearance in service"
            quantity="deviation"
            system={system}
            min={inputs.requiredClearanceUm.minUm}
            max={inputs.requiredClearanceUm.maxUm}
            onChange={(minUm, maxUm) => change({ requiredClearanceUm: { minUm, maxUm } })}
          />
        </div>
      </PanelSection>
    </>
  )
}

interface NominalSizeProps {
  nominalMm: number
  system: UnitSystem
  onChange: (nominalMm: number) => void
}

/** Ø field with the ISO size range it falls in, and the log-scale slider. */
function NominalSize({ nominalMm, system, onChange }: NominalSizeProps) {
  const range = nominalSizeRange(nominalMm)
  const length = (mm: number) => formatDecimal(toDisplay('length', system, mm), system === 'si' ? 0 : 3)
  const ticks = SLIDER_TICKS[system].map((value, i, all) => ({
    label: i === all.length - 1 ? `${value} ${system === 'si' ? 'mm' : 'in'}` : String(value),
    percent: tickPercent(value, system),
  }))
  return (
    <div className={styles.nominal}>
      <div className={styles.nominalHead}>
        <span>Nominal diameter</span>
        {range.ok && <span className={styles.hint}>range {length(range.value.overMm)}–{length(range.value.upToMm)}</span>}
      </div>
      <QuantityField
        prefix="Ø"
        aria-label="Nominal diameter"
        quantity="length"
        system={system}
        value={nominalMm}
        onChange={onChange}
      />
      <Slider
        name="Nominal diameter, coarse"
        value={sliderPosition(nominalMm)}
        min={0}
        max={SLIDER_STEPS}
        valueText={formatQuantity('length', system, nominalMm, { withUnit: true })}
        onChange={(position) => onChange(sliderSizeMm(position, system))}
        ticks={ticks}
      />
    </div>
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
