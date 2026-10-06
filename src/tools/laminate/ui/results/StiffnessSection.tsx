// The laminate stiffness: which couplings it has (each flag reads straight
// off the matrices), the A, B and D matrices themselves, and the effective
// engineering constants of the laminate as a plate.
import { Badge, MonoLabel } from '../../../../app/ui'
import type { UnitSystem } from '../../../../core/units'
import type { LaminateAnalysis } from '../../calc'
import { abdMatrices, constantViews, COUPLING_FLAGS } from '../logic/stiffness'
import styles from './results.module.css'

interface StiffnessSectionProps {
  analysis: Pick<LaminateAnalysis, 'stiffness' | 'coupling' | 'constants'>
  system: UnitSystem
}

export function StiffnessSection({ analysis, system }: StiffnessSectionProps) {
  const { coupling, constants } = analysis
  return (
    <>
      <section className={styles.section} aria-label="Couplings">
        <MonoLabel>Couplings</MonoLabel>
        <ul className={styles.couplings}>
          {COUPLING_FLAGS.map((flag) => {
            const present = coupling[flag.key]
            return (
              <li key={flag.key} className={styles.coupling}>
                <Badge tone={present ? 'warn' : 'ok'}>{present ? flag.present : flag.absent}</Badge>
                <span>
                  {flag.label}
                  {present && <span className={styles.effect}>: {flag.effect}</span>}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <section className={styles.section} aria-label="ABD matrix">
        <MonoLabel>ABD matrix</MonoLabel>
        {abdMatrices(analysis.stiffness, system).map((matrix) => (
          <div key={matrix.symbol} className={styles.matrix}>
            <span className={styles.matrixSymbol}>{matrix.symbol}</span>
            <table className={styles.matrixTable} aria-label={`${matrix.symbol} matrix, ${matrix.unit}`}>
              <tbody>
                {matrix.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((value, j) => (
                      <td key={j}>{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <span className={styles.matrixUnit}>{matrix.unit}</span>
          </div>
        ))}
      </section>

      <section className={styles.section} aria-label="Engineering constants">
        <div className={styles.sectionHead}>
          <MonoLabel>Engineering constants</MonoLabel>
          {constants.apparent && <MonoLabel tone="faint">apparent: B ≠ 0</MonoLabel>}
        </div>
        <dl className={styles.constantList}>
          {constantViews(constants, system).map((c) => (
            <div key={c.symbol} className={styles.constantRow}>
              <dt>
                <span className={styles.constantSymbol}>{c.symbol}</span> {c.label}
              </dt>
              <dd>
                {c.value}
                {c.unit && <span className={styles.constantUnit}> {c.unit}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  )
}
