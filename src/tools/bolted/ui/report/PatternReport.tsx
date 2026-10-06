// The A4 report of a bolt pattern: title block, verdict strip, every input
// of each joint type side by side, the plan under the governing load case,
// every load case with the bolt that decides it, the bolts of the governing
// load case, the governing bolt's calculation trail, warnings and footer.
import {
  Report, ReportFigure, ReportSection, ReportFooter, ReportSummary, ReportSummaryCell, ReportTitleBlock,
  ReportWarnings, reportStyles as styles,
} from '../../../../app/report'
import { formatQuantity, unitOf, type Quantity, type UnitSystem } from '../../../../core/units'
import type { Vector3 } from '../../pattern'
import type { BoltResults } from '../logic/boltResults'
import { designFacts, serviceTemperatureFact, type DesignFact } from '../logic/designFacts'
import { patternWarnings } from '../logic/reportWarnings'
import { CALCULATION_STATUS, decidingBolt, formatUtilisation, governingCase, patternStatus, verdictCheck } from '../logic/verdict'
import { PatternPlan } from '../pattern/PatternPlan'
import type { BoltInputs, PatternSpec } from '../state/boltInputs'
import { STANDARDS, STATUS_HEADLINE, unitsLine } from './reportShared'
import report from './report.module.css'
import { TrailTable } from './TrailTable'

interface PatternReportProps {
  /** The calculation's name in the library. */
  name: string
  inputs: BoltInputs
  results: BoltResults
  system: UnitSystem
}


export function PatternReport({ name, inputs, results, system }: PatternReportProps) {
  const { pattern } = inputs
  const governing = governingCase(results.loadCases)
  if (!governing.ok) return <p>There is no pattern to report: {governing.error}</p>
  const { loadCase, analysis, bolt, maxUtilisation } = governing.value
  const status = CALCULATION_STATUS[patternStatus(results.loadCases.flatMap((c) => (c.analysis.ok ? [c.analysis.value] : [])))]
  const warnings = patternWarnings(results.loadCases)
  const governingStep = verdictCheck(bolt.analysis)
  const types = jointTypeRows(pattern, system)
  const vector = (quantity: Quantity, v: Vector3) => [v.x, v.y, v.z].map((n) => formatQuantity(quantity, system, n)).join(', ')
  const force = (n: number) => formatQuantity('force', system, n)

  return (
    <Report>
      <ReportTitleBlock
        title="Bolted Joint Report"
        calculation={name}
        subtitle={`${pattern.bolts.length}-bolt pattern · ${pattern.jointTypes.length} joint types · ${pattern.loadCases.length} load cases`}
        meta={[['Mode', 'Bolt pattern, rigid plate'], ['Units', unitsLine(system)]]}
      />

      <ReportSummary status={status} headline={STATUS_HEADLINE[status]} warnings={warnings.length} warningsSection={6}>
        <ReportSummaryCell label="GOVERNING" value={`${bolt.bolt.id} (${bolt.bolt.jointTypeId})`} note={`${loadCase.id} ${loadCase.name}${governingStep ? ` · ${governingStep.rStep}` : ''}`} />
        <ReportFigure label="U MAX" value={formatUtilisation(maxUtilisation)} unit="" />
        <ReportFigure label="BOLTS" value={String(pattern.bolts.length)} unit={`in ${pattern.jointTypes.length} types`} />
      </ReportSummary>

      <ReportSection heading="1 · Joint types" note={`service temperature ${serviceTemperatureFact(inputs.serviceTempC, system).value}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th />
              {pattern.jointTypes.map(({ id }) => (
                <th key={id}>{id}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {types.map(({ label, values }) => (
              <tr key={label}>
                <td>{label}</td>
                {values.map((value, i) => (
                  <td key={pattern.jointTypes[i].id} className={value?.warn ? styles.warnValue : undefined}>
                    {value?.value ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </ReportSection>

      <ReportSection heading={`2 · Plan under ${loadCase.id}`} note="ring = utilisation, arrows = shear">
        <div className={`${styles.diagram} ${report.plan}`}>
          <PatternPlan pattern={pattern} loadCase={loadCase} analysis={{ ok: true, value: analysis }} system={system} selectedBolt={bolt.bolt.id} />
        </div>
      </ReportSection>

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
                <td className={styles.number}>{a.ok ? decidingBolt(a.value).bolt.id : '—'}</td>
                <td className={styles.number}>{a.ok ? formatUtilisation(decidingBolt(a.value).utilisation) : '—'}</td>
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
              const step = verdictCheck(b.analysis)
              return (
                <tr key={b.bolt.id} className={b.status === 'fail' ? styles.emphasis : undefined}>
                  <td>{b.bolt.id}</td>
                  <td>{b.bolt.jointTypeId}</td>
                  <td className={styles.number}>{force(b.load.axialN)}</td>
                  <td className={styles.number}>{force(b.load.shearN)}</td>
                  <td className={styles.number}>{formatUtilisation(b.utilisation)}</td>
                  <td className={styles.source}>{step ? `${step.rStep} ${step.title}` : ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </ReportSection>

      <ReportSection heading={`5 · Calculation of ${bolt.bolt.id} in ${loadCase.id}, VDI 2230-1 R0 … R13`} breakable>
        <TrailTable steps={bolt.analysis.steps} system={system} />
      </ReportSection>

      <ReportWarnings heading="6 · Warnings" warnings={warnings} />
      <ReportFooter standards={STANDARDS} />
    </Report>
  )
}

interface JointTypeRow {
  readonly label: string
  /** One per joint type, in order; null where the type has no such input (a through-bolt's engagement). */
  readonly values: readonly (DesignFact | null)[]
}

/** The joint types' inputs as rows of one table: the bolt count first, then every design fact in the order first met. */
function jointTypeRows(pattern: PatternSpec, system: UnitSystem): JointTypeRow[] {
  const facts = pattern.jointTypes.map(({ id, design }) => [
    { label: 'Bolts', value: String(pattern.bolts.filter((b) => b.jointTypeId === id).length), mono: true },
    ...designFacts(design, system),
  ])
  const labels = [...new Set(facts.flat().map((f) => f.label))]
  return labels.map((label) => ({ label, values: facts.map((own) => own.find((f) => f.label === label) ?? null) }))
}
