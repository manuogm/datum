// Calculator, results: the verdict in service first (the clearance edge that
// governs, against the required window; without a window, the fit and its
// clearance in service, not judged) and any material warning under it, then
// on request the details (zone diagram, fit spectrum and every limit and
// clearance) and the calculation (each value's formula and source).
import { cx, PanelSection, ProblemCallout, ResultRow, ResultsLayout, StepPage, VerdictCard } from '../../../../app/ui'
import { formatQuantity, formatQuantityRange, unitOf, type UnitSystem } from '../../../../core/units'
import { REFERENCE_TEMP_C } from '../../advisor'
import type { FitAnalysis } from '../../calc'
import { fitQuantities, limitsText, thermalQuantities, type FitQuantity, type FitQuantityKey } from '../logic/fitQuantities'
import { serviceClearance, type ServiceClearance } from '../logic/serviceClearance'
import { serviceSummary } from '../logic/serviceSummary'
import { calculatorSentence, governingEdge, unjudgedSentence } from '../logic/verdict'
import { FIT_TYPE_LABEL, nominalLabel } from '../shared/labels'
import { MaterialNotes } from '../shared/MaterialNotes'
import { QuantityDetails } from '../shared/QuantityDetails'
import sharedStyles from '../shared/shared.module.css'
import type { FitStepProps } from '../shared/stepProps'
import { ZoneDiagram } from '../shared/ZoneDiagram'
import type { FitInputs } from '../state/fitInputs'
import styles from './calculator.module.css'
import { FitSpectrum } from './FitSpectrum'

const REFERENCE = 'ISO 286-1:2010'

export function CalculatorResults({ inputs, results, system, flow, fault }: FitStepProps) {
  const calculation = results.calculation
  if (!calculation.ok || fault?.step === 'service') {
    const problem = calculation.ok
      ? { title: 'Not checked in service', step: 'service', label: 'Service', error: fault?.error }
      : { title: 'Not defined by ISO 286', step: 'fit', label: 'Size & fit', error: calculation.error }
    return (
      <StepPage {...flow.page} title="Results" wide>
        <ResultsLayout
          verdict={
            <ProblemCallout title={problem.title} back={{ label: problem.label, onClick: () => flow.goTo(problem.step) }}>
              {problem.error}
            </ProblemCallout>
          }
        />
      </StepPage>
    )
  }
  const fit = calculation.value
  const service = serviceClearance(fit, inputs, results.housing, results.shaft)
  const quantities = fitQuantities(fit, system)
  const pick = (...keys: FitQuantityKey[]) => quantities.filter((q) => keys.includes(q.key))
  const thermal = thermalQuantities(service, system)
  return (
    <StepPage
      {...flow.page}
      title="Results"
      hint={`${nominalLabel(fit.nominalMm, system)} ${fit.designation} in ${results.housing.name} and ${results.shaft.name}, checked in service to ISO 286.`}
      wide
    >
      <ResultsLayout
        memoryKey={flow.memoryKey}
        verdict={
          <div className={sharedStyles.verdict}>
            <CalculatorVerdict fit={fit} service={service} inputs={inputs} system={system} />
            <MaterialNotes notes={results.materialNotes} />
          </div>
        }
        detailsSummary="Tolerance zones · fit spectrum · limits and clearances"
        details={
          <>
            <div className={cx(styles.diagramArea, styles.detailsDiagram)}>
              <ZoneDiagram fit={fit} system={system} variant="screen" />
            </div>
            <FitSpectrum service={service} window={inputs.requiredClearanceUm} system={system} />
            <div className={styles.values}>
              <ResultRow layout="stacked" marker={{ color: 'hole' }} label="Hole limits" value={limitsText(fit.hole, system)} unit={unitOf('length', system)} />
              <ResultRow layout="stacked" marker={{ color: 'accent' }} label="Shaft limits" value={limitsText(fit.shaft, system)} unit={unitOf('length', system)} />
              {pick('maxClearance', 'minClearance', 'meanClearance', 'fitTolerance').map((q) => (
                <ResultRow key={q.key} label={q.label} value={q.value} unit={q.unit} />
              ))}
              {thermal.map((q) => (
                <ResultRow key={q.key} label={q.label} value={q.value} unit={q.unit} marker={{ color: 'warn', shape: 'dot' }} />
              ))}
            </div>
          </>
        }
        calculationSummary="Formulas and values · ISO 286-1, 286-2 · thermal shift"
        calculation={
          <>
            <FormulaGroup label="Hole" quantities={pick('holeMax', 'holeMin', 'holeTolerance')} />
            <FormulaGroup label="Shaft" quantities={pick('shaftMax', 'shaftMin', 'shaftTolerance')} />
            <FormulaGroup label={`Clearance at ${referenceTemp(system)}`} quantities={pick('maxClearance', 'minClearance', 'meanClearance', 'fitTolerance')} />
            {thermal.length > 0 && <FormulaGroup label="Clearance in service" quantities={thermal} />}
          </>
        }
      />
    </StepPage>
  )
}

interface CalculatorVerdictProps {
  fit: FitAnalysis
  service: ServiceClearance
  inputs: FitInputs
  system: UnitSystem
}

/**
 * In-service verdict: the governing edge of the clearance against its window
 * limit, then the fit at 20 °C. Without a required window: the fit type and
 * its clearance in service, with no target (status pass).
 */
function CalculatorVerdict({ fit, service, inputs, system }: CalculatorVerdictProps) {
  const deviation = (um: number) => formatQuantity('deviation', system, um)
  const deviationUnit = unitOf('deviation', system)
  const at20 = referenceTemp(system)
  const figures = [
    { label: `Min clearance, ${at20}`, symbol: 'Cmin', value: deviation(fit.minClearanceUm), unit: deviationUnit },
    { label: `Max clearance, ${at20}`, symbol: 'Cmax', value: deviation(fit.maxClearanceUm), unit: deviationUnit },
    { label: 'Fit type', value: FIT_TYPE_LABEL[fit.fitType] },
    { label: 'Fit', value: `${nominalLabel(fit.nominalMm, system)} ${fit.designation}` },
  ]
  const window = inputs.requiredClearanceUm
  if (window === null) {
    const { minC, maxC } = inputs.serviceTempC
    const temperatures = minC === maxC
      ? formatQuantity('temperature', system, minC, { withUnit: true })
      : formatQuantityRange('temperature', system, minC, maxC)
    return (
      <VerdictCard
        status={service.status}
        sentence={unjudgedSentence(FIT_TYPE_LABEL[fit.fitType], fit, service, system)}
        detail={`Service temperature ${temperatures}. Set a required clearance on the Service step to judge the fit against it.`}
        reference={REFERENCE}
        headline={{
          label: 'Clearance in service',
          value: formatQuantityRange('deviation', system, service.inServiceUm.minUm, service.inServiceUm.maxUm, false),
          unit: deviationUnit,
          target: 'no required window',
        }}
        figures={figures}
      />
    )
  }
  const governing = governingEdge(service.inServiceUm, window)
  return (
    <VerdictCard
      status={service.status}
      sentence={calculatorSentence(service.status, governing.edge)}
      detail={`In service ${serviceSummary(service, inputs, system)}.`}
      reference={REFERENCE}
      headline={{
        label: governing.edge === 'min' ? 'Min clearance in service' : 'Max clearance in service',
        value: deviation(governing.valueUm),
        unit: deviationUnit,
        target: `${governing.edge === 'min' ? '≥' : '≤'} ${deviation(governing.limitUm)} ${deviationUnit}`,
      }}
      figures={figures}
    />
  )
}

/** '20 °C' (or '68 °F'), the temperature ISO 286 sizes are given at. */
const referenceTemp = (system: UnitSystem) => formatQuantity('temperature', system, REFERENCE_TEMP_C, { withUnit: true })

/** One group of worked formulas (hole, shaft, clearances) with their sources. */
function FormulaGroup({ label, quantities }: { label: string; quantities: readonly FitQuantity<string>[] }) {
  return (
    <PanelSection label={label}>
      <QuantityDetails quantities={quantities} />
    </PanelSection>
  )
}
