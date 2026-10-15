// The A4 report of a tolerance stack (design §8): title block, status strip,
// then 1 requirement and method, 2 contributors (and the linked part
// stacks of an assembly), 3 the stack chart, 4 results, 5 geometric
// conversions and modifiers, 6 sources.
import { Fragment } from 'react'
import {
  Report, ReportFacts, ReportFigure, ReportFooter, ReportSection, ReportSummary, ReportTitleBlock,
  reportStyles as styles,
} from '../../../../app/report'
import { cx } from '../../../../app/ui'
import type { CalculationStatus } from '../../../../core/library'
import type { UnitSystem } from '../../../../core/units'
import { geometricRule, type StackAnalysis } from '../../calc'
import { stackChartModel } from '../charts/stackChart'
import { StackChart } from '../charts/StackChart'
import { STANDARD_NAME, characteristicName } from '../gdt/characteristics'
import { FeatureControlFrame } from '../gdt/FeatureControlFrame'
import { ASSUMPTIONS, stackSources } from '../logic/calculation'
import { rowLabel } from '../logic/engineInput'
import { METHOD_NAME, index, len, lengthUnit, percent, plusMinus, range, requirementText, sigma, signed } from '../logic/format'
import { isBroken, linkStateText } from '../logic/links'
import { rowTable } from '../logic/rowTable'
import { savedText } from '../logic/savedText'
import { capabilityLine, sideBySide } from '../logic/sideBySide'
import type { StackResults } from '../logic/stackResults'
import { basisText, byShare, lowerName, sharesByMethod } from '../logic/verdict'
import type { StackInputs } from '../state/stackInputs'
import report from './report.module.css'

const STATUS_WORD: Record<CalculationStatus, string> = { pass: 'Pass', review: 'Review', fail: 'Fail', none: 'No requirement' }

interface StackReportProps {
  name: string
  inputs: StackInputs
  results: StackResults
  analysis: StackAnalysis
  status: CalculationStatus
  system: UnitSystem
}

export function StackReport({ name, inputs, results, analysis, status, system }: StackReportProps) {
  const unit = lengthUnit(system)
  const assembly = inputs.mode === 'assembly'
  const wcFirst = analysis.method === 'worst-case'
  const [chosen, other] = wcFirst ? [analysis.worstCase, analysis.rss] : [analysis.rss, analysis.worstCase]
  const { cpk } = analysis.capability
  const subtitle = [assembly ? 'Assembly' : 'Part', ...(assembly ? [] : [inputs.partName.trim() || 'Part']), lowerName(inputs.resultName), STANDARD_NAME[inputs.standard]].join(' · ')
  const rows = rowTable(inputs, analysis, results.links, system)
  const geometricRows = rows.filter((row) => row.geometric !== null)
  const links = [...results.links.values()]
  let section = 0
  const next = () => ++section
  return (
    <Report>
      <ReportTitleBlock
        title="Tolerance Stack-up Report"
        calculation={name}
        subtitle={subtitle}
        meta={[
          ['Mode', assembly ? 'Assembly' : 'Part'],
          ['Method', METHOD_NAME[analysis.method]],
          ['Standard', STANDARD_NAME[inputs.standard]],
          ['Units', unit],
        ]}
      />

      <ReportSummary status={status} headline={STATUS_WORD[status]} warnings={0} warningsSection={0} note={basisText(analysis, results.brokenLinks.length)}>
        <ReportFigure label={`RESULT · ${wcFirst ? 'WC' : 'RSS'}`} value={range(system, chosen.min, chosen.max)} unit={unit} />
        <ReportFigure label={wcFirst ? 'RSS ±3σ' : 'WORST CASE'} value={range(system, other.min, other.max)} unit={unit} />
        {cpk !== null ? <ReportFigure label="CAPABILITY · Cpk" value={index(cpk)} unit="" /> : <ReportFigure label="STD DEVIATION · σ" value={sigma(system, analysis.sigma)} unit={unit} />}
      </ReportSummary>

      <ReportSection heading={`${next()} · Requirement and method`}>
        <ReportFacts
          facts={[
            { label: 'Result', value: analysis.name },
            { label: 'Requirement', value: `${requirementText(system, inputs.requirement)}${inputs.requirement.min === null && inputs.requirement.max === null ? '' : ` ${unit}`}`, mono: true },
            { label: 'Nominal', value: `${len(system, analysis.nominal)} ${unit}`, mono: true },
            { label: 'Method of the verdict', value: wcFirst ? 'Worst case (both methods worked out)' : 'RSS ±3σ (both methods worked out)' },
            { label: 'Drawing standard', value: STANDARD_NAME[inputs.standard] },
            ...(inputs.startLabel.trim() || inputs.endLabel.trim()
              ? [{ label: 'Loop', value: `${inputs.startLabel.trim() || 'start'} → ${inputs.endLabel.trim() || 'end'}` }]
              : []),
          ]}
        />
        <p className={report.paragraph}>{ASSUMPTIONS.join(' ')}</p>
      </ReportSection>

      <ReportSection heading={`${next()} · Contributors`} note={`${rows.length} rows · ${unit}`} breakable>
        <table className={cx(styles.table, report.rowTable)}>
          <thead>
            <tr>
              <th>#</th>
              <th>CONTRIBUTOR</th>
              <th>SOURCE</th>
              <th>a</th>
              <th className={styles.number}>NOMINAL</th>
              <th>TOLERANCE</th>
              <th className={styles.number}>MEAN</th>
              <th className={styles.number}>±t</th>
              <th className={styles.number}>σ</th>
              <th className={styles.number}>WC %</th>
              <th className={styles.number}>RSS %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className={styles.formula}>{row.number}</td>
                <td>{row.label}</td>
                <td className={report.sourceCell}>{row.source || '—'}</td>
                <td className={styles.formula}>{row.coefficient}</td>
                <td className={styles.number}>{row.nominal}</td>
                <td className={report.toleranceCell}>
                  {row.geometric ? <FeatureControlFrame entry={row.geometric} system={system} standard={inputs.standard} statistical={row.statistical} className={report.frame} /> : row.tolerance}
                </td>
                <td className={styles.number}>{row.mean}</td>
                <td className={styles.number}>{row.halfBand}</td>
                <td className={styles.number}>{row.sigma}</td>
                <td className={styles.number}>{row.worstCasePercent}</td>
                <td className={styles.number}>{row.rssPercent}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {links.length > 0 && (
          <>
            <h3 className={report.subheading}>Linked part stacks</h3>
            <table className={cx(styles.table, report.rowTable)}>
              <thead>
                <tr>
                  <th>PART</th>
                  <th>CALCULATION (FOLDER)</th>
                  <th>SAVED</th>
                  <th className={styles.number}>NOMINAL</th>
                  <th className={styles.number}>+DEV</th>
                  <th className={styles.number}>−DEV</th>
                  <th className={styles.number}>σ</th>
                  <th>STATUS</th>
                  <th>LINK</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.row.id}>
                    <td>{link.partName}</td>
                    <td>
                      {link.calculationName} ({link.folderName})
                    </td>
                    <td className={styles.formula}>{savedText(link.updatedAt)}</td>
                    <td className={styles.number}>{len(system, link.stack.nominal)}</td>
                    <td className={styles.number}>{signed(system, link.stack.upperDeviation)}</td>
                    <td className={styles.number}>{signed(system, link.stack.lowerDeviation)}</td>
                    <td className={styles.number}>{sigma(system, link.stack.sigma)}</td>
                    <td>{link.partStatus ? STATUS_WORD[link.partStatus] : '—'}</td>
                    <td className={cx(isBroken(link.state) && report.bad)}>{linkStateText(link)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </ReportSection>

      <ReportSection heading={`${next()} · Stack chart`} note="loop to scale · effect of each row on the result">
        <div className={report.chart}>
          <StackChart
            model={stackChartModel({ inputs, analysis, links: results.links }, system, status)}
            resultName={inputs.resultName}
            unit={unit}
            start={inputs.startLabel}
            end={inputs.endLabel}
          />
        </div>
      </ReportSection>

      <ReportSection heading={`${next()} · Results`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>METHOD</th>
              <th className={styles.number}>RANGE {unit}</th>
              <th className={styles.number}>±</th>
              <th className={styles.number}>MARGIN TO MIN</th>
              <th className={styles.number}>MARGIN TO MAX</th>
              <th className={styles.number}>OUT OF SPEC</th>
              <th>VERDICT</th>
            </tr>
          </thead>
          <tbody>
            {sideBySide(analysis, system).map((line) => (
              <tr key={line.method} className={cx(line.chosen && styles.emphasis)}>
                <td>
                  {line.name}
                  {line.chosen && ' · verdict'}
                </td>
                <td className={styles.number}>{line.range}</td>
                <td className={styles.number}>{line.halfBand}</td>
                <td className={styles.number}>{line.marginToMin}</td>
                <td className={styles.number}>{line.marginToMax}</td>
                <td className={styles.number}>{line.outOfSpec}</td>
                <td>{line.status ? STATUS_WORD[line.status] : 'Not judged'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={report.mono}>{capabilityLine(analysis, system)}</p>
        <Contributions inputs={inputs} results={results} analysis={analysis} />
      </ReportSection>

      {geometricRows.length > 0 && (
        <ReportSection heading={`${next()} · Geometric conversions and modifiers`} breakable>
          {geometricRows.map((row) => {
            const entry = row.geometric
            if (!entry) return null
            const { conversion } = row.contributor
            const rule = geometricRule(entry.characteristic, inputs.standard)
            return (
              <div key={row.id} className={report.conversion}>
                <div className={report.conversionHead}>
                  <span className={styles.formula}>#{row.number}</span>
                  <strong>{row.label}</strong>
                  <FeatureControlFrame entry={entry} system={system} standard={inputs.standard} statistical={row.statistical} className={report.frame} />
                  <span className={styles.formula}>
                    {characteristicName(entry.characteristic, inputs.standard)} → {plusMinus(system, row.contributor.halfBand)}
                  </span>
                </div>
                <p>{conversion.rule}</p>
                {conversion.modifiers.map((line) => (
                  <p key={line}>{line}</p>
                ))}
                <p>
                  <strong>Include when:</strong> {conversion.appliesWhen ?? rule.appliesWhen}
                </p>
                {conversion.unsure && (
                  <p>
                    <strong>Judgement call:</strong> {conversion.unsure}
                  </p>
                )}
                <p className={styles.source}>{conversion.source}</p>
              </div>
            )
          })}
        </ReportSection>
      )}

      <ReportSection heading={`${next()} · Sources`}>
        <ol className={report.sources}>
          {stackSources(analysis).map((source) => (
            <li key={source}>{source}</li>
          ))}
        </ol>
      </ReportSection>
      <ReportFooter standards={`Drake ch. 9 and 11 · ${STANDARD_NAME[inputs.standard]} · worst case and RSS`} />
    </Report>
  )
}

/** Contributions as static bars: the verdict method's share, the other method's in a second column; an assembly's parts with their own rows indented. */
function Contributions({ inputs, results, analysis }: Omit<StackReportProps, 'name' | 'status' | 'system'>) {
  const shares = sharesByMethod(analysis)
  const others = sharesByMethod(analysis, analysis.method === 'worst-case' ? 'rss' : 'worst-case')
  const verdictShort = analysis.method === 'worst-case' ? 'WC' : 'RSS'
  const otherShort = analysis.method === 'worst-case' ? 'RSS' : 'WC'
  return (
    <>
      <h3 className={report.subheading}>Contributions · share of the {analysis.method === 'worst-case' ? 'worst case' : 'RSS variance'}</h3>
      <table className={cx(styles.table, report.shares)}>
        <thead>
          <tr>
            <th>#</th>
            <th>CONTRIBUTOR</th>
            <th>{verdictShort} SHARE</th>
            <th className={styles.number}>{verdictShort} %</th>
            <th className={styles.number}>{otherShort} %</th>
          </tr>
        </thead>
        <tbody>
          {byShare(shares).map((i) => {
            const input = inputs.rows[i]
            const link = input?.kind === 'linked' ? results.links.get(input.id) : undefined
            const part = link?.part ?? null
            const label = link ? `${link.partName} stack` : input?.kind === 'dimension' ? rowLabel(input, i) : analysis.contributors[i].label
            const partShares = part ? sharesByMethod(part, analysis.method) : []
            const partOthers = part ? sharesByMethod(part, analysis.method === 'worst-case' ? 'rss' : 'worst-case') : []
            return (
              <Fragment key={input?.id ?? i}>
                <tr>
                  <td className={styles.formula}>{i + 1}</td>
                  <td>{label}</td>
                  <td>
                    <span className={report.bar} style={{ width: `${Math.max(0, Math.min(100, shares[i]))}%` }} />
                  </td>
                  <td className={styles.number}>{percent(shares[i])}</td>
                  <td className={styles.number}>{percent(others[i])}</td>
                </tr>
                {part?.contributors.map((partRow, j) => {
                  const partInput = link?.partInputs?.rows[j]
                  return (
                    <tr key={`${i}.${j}`} className={report.subRow}>
                      <td className={styles.formula}>
                        {i + 1}.{j + 1}
                      </td>
                      <td>{partInput?.kind === 'dimension' ? rowLabel(partInput, j) : partRow.label}</td>
                      <td>
                        <span className={cx(report.bar, report.subBar)} style={{ width: `${Math.max(0, Math.min(100, (shares[i] * partShares[j]) / 100))}%` }} />
                      </td>
                      <td className={styles.number}>{percent((shares[i] * partShares[j]) / 100)}</td>
                      <td className={styles.number}>{percent((others[i] * partOthers[j]) / 100)}</td>
                    </tr>
                  )
                })}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </>
  )
}
