// Depth 2 of the results, "Show details" (design §7.2): the stack chart as on
// the chain step, the linked parts of an assembly, the contributions with
// their method switch, and worst case and RSS side by side.
import { calcHref } from '../../../../app/router/routes'
import { Badge, Marker, MonoLabel, cx } from '../../../../app/ui'
import type { UnitSystem } from '../../../../core/units'
import type { StackAnalysis } from '../../calc'
import { ContributionChart } from '../charts/ContributionChart'
import { StackChart } from '../charts/StackChart'
import { stackChartModel } from '../charts/stackChart'
import { lengthUnit } from '../logic/format'
import { LINK_BADGE, type ResolvedLink } from '../logic/links'
import { savedText } from '../logic/savedText'
import { capabilityLine, sideBySide } from '../logic/sideBySide'
import type { StackResults } from '../logic/stackResults'
import type { StackInputs } from '../state/stackInputs'
import styles from './results.module.css'

interface ResultsDetailsProps {
  calculationId: string
  inputs: StackInputs
  results: StackResults
  analysis: StackAnalysis
  system: UnitSystem
  status: string
}

export function ResultsDetails({ calculationId, inputs, results, analysis, system, status }: ResultsDetailsProps) {
  const model = stackChartModel({ inputs, analysis, links: results.links }, system, status)
  const links = [...results.links.values()]
  return (
    <div className={styles.details}>
      <StackChart model={model} resultName={inputs.resultName} unit={lengthUnit(system)} start={inputs.startLabel} end={inputs.endLabel} />
      {links.length > 0 && <LinkedParts links={links} />}
      <ContributionChart inputs={inputs} analysis={analysis} links={results.links} system={system} memoryKey={`stack:${calculationId}/shares`} />
      <SideBySide analysis={analysis} system={system} />
    </div>
  )
}

const STATUS_WORD = { pass: 'Pass', review: 'Review', fail: 'Fail', none: 'No requirement' } as const
const STATUS_TONE = { pass: 'ok', review: 'warn', fail: 'bad', none: 'faint' } as const

/** One line per linked part: its name, calculation, when it was saved, its own status, and the link's state if not plain. */
function LinkedParts({ links }: { links: readonly ResolvedLink[] }) {
  return (
    <section className={styles.block} aria-label="Linked parts">
      <MonoLabel>Linked parts</MonoLabel>
      <ul className={styles.linkedParts}>
        {links.map((link) => (
          <li key={link.row.id} className={styles.linkedPart}>
            <a className={styles.partLink} href={link.state === 'missing' ? undefined : calcHref(link.row.calcId)}>
              {link.partName}
            </a>
            <span className={styles.muted}>
              {link.calculationName} · saved {savedText(link.updatedAt)}
            </span>
            {link.partStatus && (
              <span className={styles.partStatus}>
                <Marker color={STATUS_TONE[link.partStatus]} />
                {STATUS_WORD[link.partStatus]}
              </span>
            )}
            {link.state !== 'linked' && <Badge tone={LINK_BADGE[link.state].tone}>{LINK_BADGE[link.state].text.toUpperCase()}</Badge>}
          </li>
        ))}
      </ul>
    </section>
  )
}

const VERDICT_TEXT = { pass: styles.okText, review: styles.warnText, fail: styles.badText }

/** WORST CASE AND RSS SIDE BY SIDE, then σ · Cp · Cpk · mean. */
export function SideBySide({ analysis, system }: { analysis: StackAnalysis; system: UnitSystem }) {
  const unit = lengthUnit(system)
  return (
    <section className={styles.block} aria-label="Worst case and RSS side by side">
      <MonoLabel>Worst case and RSS side by side</MonoLabel>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Method</th>
              <th>Range, {unit}</th>
              <th>±</th>
              <th>Margin to min</th>
              <th>Margin to max</th>
              <th>Out of spec</th>
              <th>Verdict</th>
            </tr>
          </thead>
          <tbody>
            {sideBySide(analysis, system).map((line) => (
              <tr key={line.method}>
                <th scope="row">
                  {line.name}
                  {line.chosen && <span className={styles.muted}> · verdict</span>}
                </th>
                <td className={styles.num}>{line.range}</td>
                <td className={styles.num}>{line.halfBand}</td>
                <td className={styles.num}>{line.marginToMin}</td>
                <td className={styles.num}>{line.marginToMax}</td>
                <td className={styles.num}>{line.outOfSpec}</td>
                <td className={cx(line.status && VERDICT_TEXT[line.status])}>{line.status ? STATUS_WORD[line.status] : 'Not judged'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.capability}>{capabilityLine(analysis, system)}</p>
    </section>
  )
}
