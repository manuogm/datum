// The A4 report of a laminate: title block, first-ply failure verdict,
// inputs, the ply stack and failure index through the thickness, the
// laminate stiffness, every ply at its critical face, warnings and footer.
import {
  Report, ReportFacts, ReportFigure, ReportSection, ReportFooter, ReportSummary, ReportSummaryCell, ReportTitleBlock,
  ReportWarnings, reportStyles as styles, type ReportStatus,
} from '../../../../app/report'
import { cx } from '../../../../app/ui'
import { formatQuantity, unitOf, type UnitSystem } from '../../../../core/units'
import type { LaminateAnalysis } from '../../calc'
import { CRITERION_LABELS, formatFactor, LAMINATE_STANDARDS, modeText, plyMaterialName, plyRangeText } from '../logic/labels'
import { leadingLoad } from '../logic/loads'
import { laminateFacts, laminateWarnings, plyRows, unitsLine } from '../logic/reportContent'
import { laminateStatus, plyTones } from '../logic/verdict'
import { StackPlot } from '../plots/StackPlot'
import { ThicknessPlot } from '../plots/ThicknessPlot'
import type { LaminateInputs } from '../state/lamInputs'
import report from './report.module.css'
import { StiffnessTables } from './StiffnessTables'

const STATUS_HEADLINE: Record<ReportStatus, string> = {
  pass: 'Meets RF target',
  review: 'Below RF target',
  fail: 'First ply fails',
}

interface LaminateReportProps {
  /** The calculation's name in the library. */
  name: string
  analysis: LaminateAnalysis
  inputs: LaminateInputs
  system: UnitSystem
}

export function LaminateReport({ name, analysis, inputs, system }: LaminateReportProps) {
  const { layup, firstPlyFailure } = analysis
  const status = laminateStatus(firstPlyFailure)
  const warnings = laminateWarnings(analysis)
  const load = leadingLoad(firstPlyFailure.loads)
  const materials = [...new Set(inputs.plies.map((p) => p.materialId))].map(plyMaterialName).join(', ')
  const critical = firstPlyFailure.criticalPlies
  return (
    <Report>
      <ReportTitleBlock
        title="Composite Laminate Report"
        calculation={name}
        subtitle={`${layup.notation} · ${materials}`}
        meta={[['Criterion', CRITERION_LABELS[inputs.criterion]], ['Units', unitsLine(system)]]}
      />

      <ReportSummary status={status} headline={STATUS_HEADLINE[status]} warnings={warnings.length} warningsSection={5}>
        <ReportFigure label={`RF MIN · TARGET ${formatFactor(firstPlyFailure.targetReserveFactor)}`} value={formatFactor(firstPlyFailure.reserveFactor)} unit="" />
        <ReportSummaryCell
          label="CRITICAL PLIES"
          value={critical.length > 0 ? plyRangeText(critical) : '—'}
          note={critical.length > 0 ? modeText(analysis.criterion, firstPlyFailure.mode) : undefined}
        />
        {load && (
          <ReportFigure
            label={`FPF LOAD ${load.symbol.toUpperCase()}`}
            value={formatQuantity(load.quantity, system, firstPlyFailure.loads[load.key])}
            unit={unitOf(load.quantity, system)}
          />
        )}
      </ReportSummary>

      <div className={styles.columns}>
        <ReportSection heading="1 · Inputs">
          <div className={report.facts}>
            <ReportFacts facts={laminateFacts(inputs, analysis, system)} />
          </div>
        </ReportSection>
        <ReportSection heading="2 · Ply stack and failure index" note="FI = 1/RF through the thickness">
          <div className={report.drawings}>
            <div className={cx(styles.diagram, report.drawing)}>
              <StackPlot anglesDeg={analysis.plies.map((p) => p.angleDeg)} tones={plyTones(analysis)} criticalPlies={critical} />
            </div>
            <div className={cx(styles.diagram, report.drawing)}>
              <ThicknessPlot analysis={analysis} component="fi" system={system} />
            </div>
          </div>
        </ReportSection>
      </div>

      <ReportSection heading="3 · Laminate stiffness" note={analysis.constants.apparent ? 'apparent constants: B ≠ 0' : 'A, B, D per unit width'}>
        <StiffnessTables analysis={analysis} system={system} />
      </ReportSection>

      <ReportSection heading="4 · Plies at their critical face" note="linear CLT; no residual, interlaminar or free-edge stresses" breakable>
        <PlyTable analysis={analysis} system={system} />
      </ReportSection>

      <ReportWarnings heading="5 · Warnings" warnings={warnings} />
      <ReportFooter standards={LAMINATE_STANDARDS} />
    </Report>
  )
}

function PlyTable({ analysis, system }: { analysis: LaminateAnalysis; system: UnitSystem }) {
  const stress = unitOf('strength', system)
  return (
    <table className={cx(styles.table, report.plyTable)}>
      <thead>
        <tr>
          <th>PLY</th>
          <th>θ</th>
          <th>MATERIAL</th>
          <th className={styles.number}>t {unitOf('length', system)}</th>
          <th className={styles.number}>σ1 {stress}</th>
          <th className={styles.number}>σ2 {stress}</th>
          <th className={styles.number}>τ12 {stress}</th>
          <th className={styles.number}>FI</th>
          <th className={styles.number}>RF</th>
          <th>{analysis.criterion === 'tsai-wu' ? 'DOMINANT STRESS' : 'MODE'}</th>
        </tr>
      </thead>
      <tbody>
        {plyRows(analysis, system).map((row) => (
          <tr key={row.index} className={cx(row.critical && styles.emphasis)}>
            <td className={styles.formula}>{row.index}</td>
            <td className={styles.formula}>{row.angle}</td>
            <td>{row.material}</td>
            <td className={styles.number}>{row.thickness}</td>
            {row.stresses.map((value, i) => (
              <td key={i} className={styles.number}>
                {value}
              </td>
            ))}
            <td className={styles.number}>{row.failureIndex}</td>
            <td className={styles.number}>{row.reserveFactor}</td>
            <td>{row.mode}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
