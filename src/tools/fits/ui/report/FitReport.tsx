// The content of the A4 fit report: title block, summary, inputs, zone
// diagram, results with formulas and sources, warnings and sign-off.
import { CURRENT_USER } from '../../../../app/user.fixtures'
import { localTimestamp } from '../../../../app/format/timestamp'
import { cx, Logo, MathText } from '../../../../app/ui'
import { formatQuantity, formatQuantityRange, unitOf, type UnitSystem } from '../../../../core/units'
import { PREFERRED_FITS, type FitAnalysis } from '../../calc'
import { ASSEMBLY_LABELS } from '../logic/applications'
import { fitQuantities, thermalQuantities } from '../logic/fitQuantities'
import { candidateFor, type FitResults } from '../logic/fitResults'
import { serviceClearance, type FitStatus } from '../logic/serviceClearance'
import { reportWarnings } from '../logic/serviceSummary'
import { FIT_TYPE_LABEL, nominalLabel } from '../shared/labels'
import { ZoneDiagram } from '../shared/ZoneDiagram'
import type { FitInputs } from '../state/fitInputs'
import styles from './FitReport.module.css'
import { countOf } from '../../../../app/format/count'

const STANDARDS = 'ISO 286-1:2010, ISO 286-2:2010, ISO 1:2022 (20 °C reference temperature)'

const STATUS_HEADLINE: Record<FitStatus, string> = {
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
  const date = localTimestamp().slice(0, 10)
  const service = serviceClearance(fit, inputs, results.housing, results.shaft)
  const candidate = candidateFor(results, fit.designation)
  const materialNotes = results.advice.ok ? results.advice.value.materialNotes : []
  const warnings = reportWarnings(service, inputs, system, candidate, materialNotes)
  const preferred = PREFERRED_FITS.find((p) => p.designation === fit.designation)
  const source = inputs.mode === 'advisor' && candidate ? `Fit advisor best match, score ${candidate.score}` : 'Calculator'
  const deviation = (um: number) => formatQuantity('deviation', system, um)
  const material = (m: FitResults['housing']) => `${m.name} (α ${formatQuantity('expansion', system, m.thermalExpansionUmPerMK)})`

  return (
    <article className={styles.report}>
      <header className={styles.titleBlock}>
        <div className={styles.titleText}>
          <Logo size="sm" />
          <h1 className={styles.title}>Fit Tolerance Report</h1>
          <span className={styles.subtitle}>
            {nominalLabel(fit.nominalMm, system)} {fit.designation}
            {preferred && ` · ${preferred.name}`}
          </span>
        </div>
        <dl className={styles.meta}>
          <dt>Date</dt>
          <dd className={styles.mono}>{date}</dd>
          <dt>Engineer</dt>
          <dd>{CURRENT_USER.name}</dd>
          <dt>Selected by</dt>
          <dd>{source}</dd>
          <dt>Units</dt>
          <dd>{system === 'si' ? 'SI (mm, µm, °C)' : 'Imperial (in, thou, °F)'}</dd>
        </dl>
      </header>

      <section className={styles.summary} aria-label="Summary">
        <div className={styles[service.status]}>
          <span className={styles.summaryLabel}>STATUS</span>
          <span className={styles.status}>{STATUS_HEADLINE[service.status]}</span>
          <span className={styles.summaryNote}>
            {warnings.length === 0 ? 'No warnings' : `${countOf(warnings.length, 'warning')}, see §4`}
          </span>
        </div>
        <div>
          <span className={styles.summaryLabel}>FIT TYPE AT 20 °C</span>
          <span className={styles.fitType}>{FIT_TYPE_LABEL[fit.fitType]}</span>
          {preferred && <span className={styles.summaryNote}>{preferred.name}</span>}
        </div>
        <SummaryFigure label="MIN CLEARANCE" value={deviation(fit.minClearanceUm)} unit={unitOf('deviation', system)} />
        <SummaryFigure label="MAX CLEARANCE" value={deviation(fit.maxClearanceUm)} unit={unitOf('deviation', system)} />
      </section>

      <div className={styles.columns}>
        <section className={styles.section}>
          <h2 className={styles.heading}>1 · Inputs</h2>
          <dl className={styles.inputs}>
            <dt>Nominal diameter</dt>
            <dd className={styles.mono}>{formatQuantity('length', system, fit.nominalMm, { withUnit: true })}</dd>
            <dt>Hole class</dt>
            <dd className={styles.mono}>{fit.hole.designation}</dd>
            <dt>Shaft class</dt>
            <dd className={styles.mono}>{fit.shaft.designation}</dd>
            <dt>Housing material</dt>
            <dd>{material(results.housing)}</dd>
            <dt>Shaft material</dt>
            <dd>{material(results.shaft)}</dd>
            <dt>Service temperature</dt>
            <dd className={materialNotes.length > 0 ? styles.warnValue : styles.mono}>
              {formatQuantityRange('temperature', system, inputs.serviceTempC.minC, inputs.serviceTempC.maxC)}
            </dd>
            <dt>Required clearance</dt>
            <dd className={styles.mono}>
              {formatQuantityRange('deviation', system, inputs.requiredClearanceUm.minUm, inputs.requiredClearanceUm.maxUm)}
            </dd>
            <dt>Assembly</dt>
            <dd>{ASSEMBLY_LABELS[inputs.assembly]}</dd>
          </dl>
        </section>
        <section className={styles.section}>
          <h2 className={styles.heading}>
            2 · Tolerance zones <span className={styles.headingNote}>to scale, {unitOf('deviation', system)}</span>
          </h2>
          <div className={styles.diagram}>
            <ZoneDiagram fit={fit} system={system} variant="report" />
          </div>
        </section>
      </div>

      <section className={styles.section}>
        <h2 className={styles.heading}>3 · Results</h2>
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
      </section>

      {warnings.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.heading}>4 · Warnings</h2>
          <ol className={styles.warnings}>
            {warnings.map((warning, i) => (
              <li key={warning}>
                <span className={styles.warningId}>W{i + 1}</span>
                <span>{warning}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className={styles.signatures}>
        <div>
          <span className={styles.signatureLabel}>Prepared by</span>
          <span className={styles.signatureLine}>
            {CURRENT_USER.name} · {date}
          </span>
        </div>
        <div>
          <span className={styles.signatureLabel}>Checked by</span>
          <span className={cx(styles.signatureLine, styles.blank)}>Name · date</span>
        </div>
      </div>

      <footer className={styles.footer}>
        <span>Generated by Datum · {STANDARDS}</span>
        <span>{date}</span>
      </footer>
    </article>
  )
}

function SummaryFigure({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <span className={styles.summaryLabel}>{label}</span>
      <span className={styles.figure}>
        {value} <span className={styles.figureUnit}>{unit}</span>
      </span>
    </div>
  )
}
