// The content of the A4 fit report: title block, summary, inputs, zone
// diagram, results with formulas and sources, warnings and sign-off.
import {
  Report, ReportFacts, ReportFigure, ReportSection, ReportSignOff, ReportSummary, ReportSummaryCell, ReportTitleBlock,
  ReportWarnings, reportStyles as styles, type ReportStatus,
} from '../../../../app/report'
import { MathText } from '../../../../app/ui'
import { formatQuantity, formatQuantityRange, unitOf, type UnitSystem } from '../../../../core/units'
import { PREFERRED_FITS, type FitAnalysis } from '../../calc'
import { ASSEMBLY_LABELS } from '../logic/applications'
import { fitQuantities, thermalQuantities } from '../logic/fitQuantities'
import { candidateFor, type FitResults } from '../logic/fitResults'
import { serviceClearance } from '../logic/serviceClearance'
import { reportWarnings } from '../logic/serviceSummary'
import { FIT_TYPE_LABEL, nominalLabel } from '../shared/labels'
import { ZoneDiagram } from '../shared/ZoneDiagram'
import type { FitInputs } from '../state/fitInputs'

const STANDARDS = 'ISO 286-1:2010, ISO 286-2:2010, ISO 1:2022 (20 °C reference temperature)'

const STATUS_HEADLINE: Record<ReportStatus, string> = {
  pass: 'Pass in service',
  review: 'Review in service',
  fail: 'Fail in service',
}

interface FitReportProps {
  fit: FitAnalysis
  inputs: FitInputs
  results: FitResults
  system: UnitSystem
}

export function FitReport({ fit, inputs, results, system }: FitReportProps) {
  const service = serviceClearance(fit, inputs, results.housing, results.shaft)
  const candidate = candidateFor(results, fit.designation)
  const materialNotes = results.advice.ok ? results.advice.value.materialNotes : []
  const warnings = reportWarnings(service, inputs, system, candidate, materialNotes)
  const preferred = PREFERRED_FITS.find((p) => p.designation === fit.designation)
  const source = inputs.mode === 'advisor' && candidate ? `Fit advisor best match, score ${candidate.score}` : 'Calculator'
  const deviation = (um: number) => formatQuantity('deviation', system, um)
  const material = (m: FitResults['housing']) => `${m.name} (α ${formatQuantity('expansion', system, m.thermalExpansionUmPerMK)})`

  return (
    <Report>
      <ReportTitleBlock
        title="Fit Tolerance Report"
        subtitle={`${nominalLabel(fit.nominalMm, system)} ${fit.designation}${preferred ? ` · ${preferred.name}` : ''}`}
        meta={[['Selected by', source], ['Units', system === 'si' ? 'SI (mm, µm, °C)' : 'Imperial (in, thou, °F)']]}
      />

      <ReportSummary status={service.status} headline={STATUS_HEADLINE[service.status]} warnings={warnings.length} warningsSection={4}>
        <ReportSummaryCell label="FIT TYPE AT 20 °C" value={FIT_TYPE_LABEL[fit.fitType]} note={preferred?.name} />
        <ReportFigure label="MIN CLEARANCE" value={deviation(fit.minClearanceUm)} unit={unitOf('deviation', system)} />
        <ReportFigure label="MAX CLEARANCE" value={deviation(fit.maxClearanceUm)} unit={unitOf('deviation', system)} />
      </ReportSummary>

      <div className={styles.columns}>
        <ReportSection heading="1 · Inputs">
          <ReportFacts
            facts={[
              { label: 'Nominal diameter', value: formatQuantity('length', system, fit.nominalMm, { withUnit: true }), mono: true },
              { label: 'Hole class', value: fit.hole.designation, mono: true },
              { label: 'Shaft class', value: fit.shaft.designation, mono: true },
              { label: 'Housing material', value: material(results.housing) },
              { label: 'Shaft material', value: material(results.shaft) },
              {
                label: 'Service temperature',
                value: formatQuantityRange('temperature', system, inputs.serviceTempC.minC, inputs.serviceTempC.maxC),
                mono: true,
                warn: materialNotes.length > 0,
              },
              {
                label: 'Required clearance',
                value: formatQuantityRange('deviation', system, inputs.requiredClearanceUm.minUm, inputs.requiredClearanceUm.maxUm),
                mono: true,
              },
              { label: 'Assembly', value: ASSEMBLY_LABELS[inputs.assembly] },
            ]}
          />
        </ReportSection>
        <ReportSection heading="2 · Tolerance zones" note={`to scale, ${unitOf('deviation', system)}`}>
          <div className={styles.diagram}>
            <ZoneDiagram fit={fit} system={system} variant="report" />
          </div>
        </ReportSection>
      </div>

      <ReportSection heading="3 · Results">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>QUANTITY</th>
              <th className={styles.number}>VALUE</th>
              <th>FORMULA</th>
              <th>SOURCE</th>
            </tr>
          </thead>
          <tbody>
            {[...fitQuantities(fit, system), ...thermalQuantities(service, system)].map((q) => (
              <tr key={q.key} className={q.emphasis ? styles.emphasis : undefined}>
                <td>
                  {q.label} <MathText>{q.symbol}</MathText>
                </td>
                <td className={styles.number}>
                  {q.value} {q.unit}
                </td>
                <td className={styles.formula}>
                  <MathText>{`${q.formula} = ${q.substitution}`}</MathText>
                </td>
                <td className={styles.source}>{q.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportSection>

      <ReportWarnings heading="4 · Warnings" warnings={warnings} />
      <ReportSignOff standards={STANDARDS} />
    </Report>
  )
}
