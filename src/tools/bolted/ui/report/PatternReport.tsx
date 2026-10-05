// The A4 report of a bolt pattern: title block, verdict strip, joint types,
// the plan under the governing load case, every load case with its
// governing bolt, the bolts of the governing load case, the governing bolt's
// calculation trail, warnings and sign-off.
import {
  Report, ReportFacts, ReportFigure, ReportSection, ReportSignOff, ReportSummary, ReportSummaryCell, ReportTitleBlock,
  ReportWarnings, reportStyles as styles,
} from '../../../../app/report'
import { formatDecimal, formatQuantity, unitOf, type Quantity, type UnitSystem } from '../../../../core/units'
import type { Vector3 } from '../../pattern'
import type { BoltResults } from '../logic/boltResults'
import { jointDetail, jointTitle } from '../logic/labels'
import { patternWarnings } from '../logic/reportWarnings'
import { governingCase, patternStatus, PROJECT_STATUS } from '../logic/verdict'
import { PatternPlan } from '../pattern/PatternPlan'
import type { BoltInputs } from '../state/boltInputs'
import { STANDARDS, STATUS_HEADLINE, unitsLine } from './reportShared'
import { TrailTable } from './TrailTable'

interface PatternReportProps {
  inputs: BoltInputs
  results: BoltResults
  system: UnitSystem
}

const ratio = (value: number) => formatDecimal(value, 2, true)

export function PatternReport({ inputs, results, system }: PatternReportProps) {
  const { pattern } = inputs
  const governing = governingCase(results.loadCases)
  if (!governing.ok) return <p>There is no pattern to report: {governing.error}</p>
  const { loadCase, analysis, bolt } = governing.value
  const status = PROJECT_STATUS[patternStatus(results.loadCases.flatMap((c) => (c.analysis.ok ? [c.analysis.value] : [])))]
  const warnings = patternWarnings(results.loadCases)
  const governingStep = bolt.analysis.steps.find((s) => s.id === bolt.analysis.summary.governing)
  const vector = (quantity: Quantity, v: Vector3) => [v.x, v.y, v.z].map((n) => formatQuantity(quantity, system, n)).join(', ')
  const force = (n: number) => formatQuantity('force', system, n)

  return (
    <Report>
      <ReportTitleBlock
        title="Bolted Joint Report"
        subtitle={`${pattern.bolts.length}-bolt pattern · ${pattern.jointTypes.length} joint types · ${pattern.loadCases.length} load cases`}
        meta={[['Mode', 'Bolt pattern, rigid plate'], ['Units', unitsLine(system)]]}
      />

      <ReportSummary status={status} headline={STATUS_HEADLINE[status]} warnings={warnings.length} warningsSection={6}>
        <ReportSummaryCell label="GOVERNING" value={`${bolt.bolt.id} (${bolt.bolt.jointTypeId})`} note={`${loadCase.id} ${loadCase.name}${governingStep ? ` · ${governingStep.rStep}` : ''}`} />
        <ReportFigure label="U MAX" value={ratio(bolt.utilisation)} unit="" />
        <ReportFigure label="BOLTS" value={String(pattern.bolts.length)} unit={`in ${pattern.jointTypes.length} types`} />
      </ReportSummary>

      <div className={styles.columns}>
        <ReportSection heading="1 · Joint types">
          <ReportFacts
            facts={pattern.jointTypes.map(({ id, design }) => ({
              label: `${id} ×${pattern.bolts.filter((b) => b.jointTypeId === id).length}`,
              value: `${jointTitle(design)} · ${jointDetail(design)}`,
            }))}
          />
        </ReportSection>
        <ReportSection heading={`2 · Plan under ${loadCase.id}`} note="ring = utilisation, arrows = shear">
          <div className={styles.diagram}>
            <PatternPlan pattern={pattern} loadCase={loadCase} analysis={{ ok: true, value: analysis }} system={system} selectedBolt={bolt.bolt.id} />
          </div>
        </ReportSection>
      </div>

      <ReportSection heading="3 · Load cases" note={`F in ${unitOf('force', system)}, M in ${unitOf('torque', system)}, r in ${unitOf('length', system)}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>LOAD CASE</th>
              <th className={styles.number}>F x, y, z</th>
              <th className={styles.number}>M x, y, z</th>
              <th className={styles.number}>r x, y, z</th>
              <th className={styles.number}>GOVERNING</th>
              <th className={styles.number}>u</th>
            </tr>
          </thead>
          <tbody>
            {results.loadCases.map(({ loadCase: c, analysis: a }) => (
              <tr key={c.id} className={c.id === loadCase.id ? styles.emphasis : undefined}>
                <td>
                  {c.id} {c.name}
                </td>
                <td className={styles.number}>{vector('force', c.forceN)}</td>
                <td className={styles.number}>{vector('torque', c.momentNm)}</td>
                <td className={styles.number}>{vector('length', c.loadPointMm)}</td>
                <td className={styles.number}>{a.ok ? a.value.governing.bolt.id : '—'}</td>
                <td className={styles.number}>{a.ok ? ratio(a.value.governing.utilisation) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportSection>

      <ReportSection heading={`4 · Bolts in ${loadCase.id} ${loadCase.name}`} note={`forces in ${unitOf('force', system)}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>BOLT</th>
              <th>JOINT TYPE</th>
              <th className={styles.number}>FA</th>
              <th className={styles.number}>FQ</th>
              <th className={styles.number}>u</th>
              <th>GOVERNING CHECK</th>
            </tr>
          </thead>
          <tbody>
            {analysis.bolts.map((b) => {
              const step = b.analysis.steps.find((s) => s.id === b.analysis.summary.governing)
              return (
                <tr key={b.bolt.id} className={b.status === 'fail' ? styles.emphasis : undefined}>
                  <td>{b.bolt.id}</td>
                  <td>{b.bolt.jointTypeId}</td>
                  <td className={styles.number}>{force(b.load.axialN)}</td>
                  <td className={styles.number}>{force(b.load.shearN)}</td>
                  <td className={styles.number}>{ratio(b.utilisation)}</td>
                  <td className={styles.source}>{step ? `${step.rStep} ${step.title}` : ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </ReportSection>

      <ReportSection heading={`5 · Calculation of ${bolt.bolt.id} in ${loadCase.id}, VDI 2230-1 R0 … R13`}>
        <TrailTable steps={bolt.analysis.steps} system={system} />
      </ReportSection>

      <ReportWarnings heading="6 · Warnings" warnings={warnings} />
      <ReportSignOff standards={STANDARDS} />
    </Report>
  )
}
