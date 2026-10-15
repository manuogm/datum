// Depth 3 of the results, "Show calculation" (design §7.3): the equations
// filled with this stack's numbers, every row as entered and as the engine
// centred it (a geometric row opens to its modifiers and when to include
// it), the assumptions, and every source the result rests on.
import { Fragment, useState } from 'react'
import { FormulaBlock, MonoLabel, cx } from '../../../../app/ui'
import type { UnitSystem } from '../../../../core/units'
import type { StackAnalysis } from '../../calc'
import { FeatureControlFrame } from '../gdt/FeatureControlFrame'
import { ASSUMPTIONS, stackFormulas, stackSources } from '../logic/calculation'
import { lengthUnit } from '../logic/format'
import { rowTable, type RowTableRow } from '../logic/rowTable'
import { linkedParts, type StackResults } from '../logic/stackResults'
import type { StackInputs } from '../state/stackInputs'
import styles from './results.module.css'

interface ResultsCalculationProps {
  inputs: StackInputs
  results: StackResults
  analysis: StackAnalysis
  system: UnitSystem
}

export function ResultsCalculation({ inputs, results, analysis, system }: ResultsCalculationProps) {
  return (
    <div className={styles.details}>
      <section className={styles.block} aria-label="Equations">
        <MonoLabel>Equations</MonoLabel>
        <div className={styles.formulas}>
          {stackFormulas(analysis, system).map((f) => (
            <FormulaBlock key={f.symbol} {...f} />
          ))}
        </div>
      </section>
      <RowTable rows={rowTable(inputs, analysis, results.links, system)} system={system} standard={inputs.standard} />
      <section className={styles.block} aria-label="Assumptions">
        <MonoLabel>Assumptions</MonoLabel>
        <ul className={styles.list}>
          {ASSUMPTIONS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
      <section className={styles.block} aria-label="Sources">
        <MonoLabel>Sources</MonoLabel>
        <ul className={styles.list}>
          {stackSources(analysis, linkedParts(results).flatMap((link) => link.part ?? [])).map((source) => (
            <li key={source}>{source}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function RowTable({ rows, system, standard }: { rows: readonly RowTableRow[]; system: UnitSystem; standard: 'iso' | 'asme' }) {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())
  // The Source column only when a row has one (a linked part always does).
  const withSource = rows.some((row) => row.source !== '' || row.link !== null)
  const toggle = (id: string) => {
    const next = new Set(open)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setOpen(next)
  }
  return (
    <section className={styles.block} aria-label="Rows">
      <MonoLabel>Rows · {lengthUnit(system)}</MonoLabel>
      <div className={styles.tableScroll}>
        <table className={cx(styles.table, styles.rowTable)}>
          <thead>
            <tr>
              <th>#</th>
              <th>Contributor</th>
              {withSource && <th>Source</th>}
              <th title="Coefficient a">a</th>
              <th>Nominal</th>
              <th>Tolerance</th>
              <th>Mean</th>
              <th>
                <span className={styles.symbol}>±t</span>
              </th>
              <th>
                <span className={styles.symbol}>σ</span>
              </th>
              <th>WC %</th>
              <th>RSS %</th>
              <th>Rule</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const { conversion } = row.contributor
              const more = row.geometric !== null && (conversion.modifiers.length > 0 || conversion.appliesWhen !== null)
              return (
                <Fragment key={row.id}>
                  <tr>
                    <td className={styles.num}>{row.number}</td>
                    <td className={styles.textCell}>{row.label}</td>
                    {withSource && (
                      <td className={cx(styles.textCell, styles.muted)}>
                        {row.source || '—'}
                        {row.link && (
                          <span className={cx(styles.linkCell, row.link.broken && styles.badText)}>
                            saved {row.link.saved} · {row.link.state}
                          </span>
                        )}
                      </td>
                    )}
                    <td className={styles.num}>{row.coefficient}</td>
                    <td className={styles.num}>{row.nominal}</td>
                    <td className={styles.num}>
                      {row.geometric ? <FeatureControlFrame entry={row.geometric} system={system} standard={standard} statistical={row.statistical} /> : row.tolerance}
                    </td>
                    <td className={styles.num}>{row.mean}</td>
                    <td className={styles.num}>{row.halfBand}</td>
                    <td className={styles.num}>{row.sigma}</td>
                    <td className={styles.num}>{row.worstCasePercent}</td>
                    <td className={styles.num}>{row.rssPercent}</td>
                    <td className={styles.rule}>
                      {row.rule}
                      {more && (
                        <button type="button" className={styles.more} aria-expanded={open.has(row.id)} onClick={() => toggle(row.id)}>
                          {open.has(row.id) ? 'Less' : 'More'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {more && open.has(row.id) && (
                    <tr className={styles.subRow}>
                      <td />
                      <td colSpan={withSource ? 11 : 10}>
                        {conversion.modifiers.map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                        {conversion.appliesWhen && (
                          <p>
                            <strong>Include when:</strong> {conversion.appliesWhen}
                          </p>
                        )}
                        {conversion.unsure && (
                          <p>
                            <strong>Judgement call:</strong> {conversion.unsure}
                          </p>
                        )}
                        <p className={styles.muted}>{conversion.source}</p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
