// The A4 report of a single joint: title block, verdict strip, inputs,
// section and joint diagram, the calculation trail, warnings and sign-off.
import {
  Report, ReportFacts, ReportFigure, ReportSection, ReportSignOff, ReportSummary, ReportSummaryCell, ReportTitleBlock,
  ReportWarnings, reportStyles as styles,
} from '../../../../app/report'
import { formatQuantity, unitOf, type UnitSystem } from '../../../../core/units'
import type { BoltedJointAnalysis } from '../../calc'
import { jointFacts } from '../logic/designFacts'
import { jointDetail, jointTitle } from '../logic/labels'
import { jointWarnings } from '../logic/reportWarnings'
import { formatUtilisation, PROJECT_STATUS } from '../logic/verdict'
import { JointDiagram } from '../single/JointDiagram'
import { SectionDiagram } from '../single/SectionDiagram'
import type { BoltInputs } from '../state/boltInputs'
import report from './report.module.css'
import { STANDARDS, STATUS_HEADLINE, unitsLine } from './reportShared'
import { TrailTable } from './TrailTable'

interface JointReportProps {
  analysis: BoltedJointAnalysis
  inputs: BoltInputs
  system: UnitSystem
}

export function JointReport({ analysis, inputs, system }: JointReportProps) {
  const { design, loads } = inputs.joint
  const { summary, preload, steps } = analysis
  const status = PROJECT_STATUS[summary.status]
  const governing = steps.find((s) => s.id === summary.governing)
  const warnings = jointWarnings(steps)
  return (
    <Report>
      <ReportTitleBlock title="Bolted Joint Report" subtitle={`${jointTitle(design)} · ${jointDetail(design)}`} meta={[['Mode', 'Single joint'], ['Units', unitsLine(system)]]} />

      <ReportSummary status={status} headline={STATUS_HEADLINE[status]} warnings={warnings.length} warningsSection={4}>
        <ReportSummaryCell label="GOVERNING" value={governing?.rStep ?? '—'} note={governing ? `${governing.title}, u ${formatUtilisation(summary.utilisation)}` : undefined} />
        <ReportFigure label="PRELOAD FM,MIN" value={formatQuantity('force', system, preload.assemblyMinN)} unit={unitOf('force', system)} />
        <ReportFigure label="TORQUE MA" value={formatQuantity('torque', system, preload.tighteningTorqueNm)} unit={unitOf('torque', system)} />
      </ReportSummary>

      <div className={styles.columns}>
        <ReportSection heading="1 · Inputs">
          <div className={report.facts}>
            <ReportFacts facts={jointFacts(inputs, system)} />
          </div>
        </ReportSection>
        <ReportSection heading="2 · Section A–A and joint diagram" note="section to scale">
          <div className={report.drawings}>
            <div className={styles.diagram}>
              <SectionDiagram analysis={analysis} design={design} />
            </div>
            <div className={styles.diagram}>
              <JointDiagram analysis={analysis} axialN={loads.axialMaxN} system={system} />
            </div>
          </div>
        </ReportSection>
      </div>

      <ReportSection heading="3 · Calculation, VDI 2230-1 R0 … R13" breakable>
        <TrailTable steps={steps} system={system} />
      </ReportSection>

      <ReportWarnings heading="4 · Warnings" warnings={warnings} />
      <ReportSignOff standards={STANDARDS} />
    </Report>
  )
}
