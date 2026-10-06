// The laminate stiffness on paper: A, B and D side by side, the couplings
// they show, and the engineering constants.
import { reportStyles as styles } from '../../../../app/report'
import type { UnitSystem } from '../../../../core/units'
import type { LaminateAnalysis } from '../../calc'
import { abdMatrices, constantViews, COUPLING_FLAGS } from '../logic/stiffness'
import report from './report.module.css'

interface StiffnessTablesProps {
  analysis: Pick<LaminateAnalysis, 'stiffness' | 'coupling' | 'constants' | 'layup'>
  system: UnitSystem
}

export function StiffnessTables({ analysis, system }: StiffnessTablesProps) {
  return (
    <div className={report.stiffness}>
      {abdMatrices(analysis.stiffness, analysis.layup.thicknessMm, system).map((matrix) => (
        <table key={matrix.symbol} className={styles.table}>
          <thead>
            <tr>
              <th colSpan={3}>
                {matrix.symbol} · {matrix.unit}
              </th>
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row, i) => (
              <tr key={i}>
                {row.map((value, j) => (
                  <td key={j} className={styles.number}>
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ))}
      <table className={styles.table}>
        <thead>
          <tr>
            <th colSpan={2}>CONSTANTS</th>
          </tr>
        </thead>
        <tbody>
          {constantViews(analysis.constants, system).map((c) => (
            <tr key={c.symbol}>
              <td className={styles.formula}>{c.symbol}</td>
              <td className={styles.number}>
                {c.value} {c.unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={report.couplings}>
        {COUPLING_FLAGS.map((flag) => `${flag.label}: ${analysis.coupling[flag.key] ? flag.present : flag.absent}`).join(' · ')}
      </p>
    </div>
  )
}
