// Calculator mode, right column: fit type and in-service verdict, the min and
// max clearance as large readouts, then every result with its formula.
import { Badge, Callout, cx, Readout, ResultRow } from '../../../../app/ui'
import { formatQuantity, unitOf, type UnitSystem } from '../../../../core/units'
import type { FitAnalysis } from '../../calc'
import { fitQuantities, limitsText, thermalQuantities, type FitQuantity, type FitQuantityKey } from '../logic/fitQuantities'
import type { ServiceClearance } from '../logic/serviceClearance'
import { serviceSummary } from '../logic/serviceSummary'
import { FIT_TYPE_LABEL, nominalLabel, STATUS_ICON, STATUS_TITLE } from '../shared/labels'
import { QuantityDetails } from '../shared/QuantityDetails'
import type { FitInputs } from '../state/fitInputs'
import styles from './calculator.module.css'

interface ResultsProps {
  fit: FitAnalysis
  service: ServiceClearance
  inputs: FitInputs
  system: UnitSystem
}

export function Results({ fit, service, inputs, system }: ResultsProps) {
  const quantities = fitQuantities(fit, system)
  const pick = (...keys: FitQuantityKey[]) => quantities.filter((q) => keys.includes(q.key))
  const deviationUnit = unitOf('deviation', system)
  const lengthUnit = unitOf('length', system)
  return (
    <>
      <section className={styles.summary} aria-label="Summary">
        <div className={styles.fitLine}>
          <Badge variant="outlined" tone="hole">
            {FIT_TYPE_LABEL[fit.fitType]} fit
          </Badge>
          <span className={styles.fitName}>
            {nominalLabel(fit.nominalMm, system)} {fit.designation}
          </span>
        </div>
        <Callout status={STATUS_ICON[service.status]} title={STATUS_TITLE[service.status]}>
          {serviceSummary(service, inputs, system)}
        </Callout>
        {/* Imperial values are longer, so their readouts stack. */}
        <div className={cx(styles.readouts, system === 'imperial' && styles.stacked)}>
          <Readout label="Min clearance" value={formatQuantity('deviation', system, fit.minClearanceUm)} unit={deviationUnit} />
          <Readout label="Max clearance" value={formatQuantity('deviation', system, fit.maxClearanceUm)} unit={deviationUnit} />
        </div>
      </section>

      <ResultRow layout="stacked" marker={{ color: 'hole' }} label="Hole limits" value={limitsText(fit.hole, system)} unit={lengthUnit}>
        <QuantityDetails quantities={pick('holeMax', 'holeMin', 'holeTolerance')} />
      </ResultRow>
      <ResultRow layout="stacked" marker={{ color: 'accent' }} label="Shaft limits" value={limitsText(fit.shaft, system)} unit={lengthUnit}>
        <QuantityDetails quantities={pick('shaftMax', 'shaftMin', 'shaftTolerance')} />
      </ResultRow>
      {pick('maxClearance', 'minClearance', 'meanClearance', 'fitTolerance').map((q) => (
        <QuantityRow key={q.key} quantity={q} defaultOpen={q.key === 'maxClearance'} />
      ))}
      {thermalQuantities(service, system).map((q) => (
        <QuantityRow key={q.key} quantity={q} marker />
      ))}
    </>
  )
}

interface QuantityRowProps {
  quantity: FitQuantity<string>
  defaultOpen?: boolean
  /** Amber dot, for values that depend on temperature. */
  marker?: boolean
}

function QuantityRow({ quantity, defaultOpen = false, marker = false }: QuantityRowProps) {
  return (
    <ResultRow
      label={quantity.label}
      value={quantity.value}
      unit={quantity.unit}
      defaultOpen={defaultOpen}
      marker={marker ? { color: 'warn', shape: 'dot' } : undefined}
    >
      <QuantityDetails quantities={[quantity]} />
    </ResultRow>
  )
}
