// Advisor mode, centre: every charted candidate fit as a column of clearance
// bands (cold, 20 °C, hot) against the required window and the assembly
// interference limit, drawn to scale from the advisor's results.
import { cx } from '../../../../app/ui'
import { formatQuantity, formatQuantityRange, fromDisplay, toDisplay, type UnitSystem } from '../../../../core/units'
import type { ClearanceRangeUm, FitCandidate } from '../../advisor'
import { CANDIDATE_CHART_FRAME as F, candidateChartLayout } from '../logic/candidateChart'
import { scoreTone } from '../logic/candidates'
import type { TemperatureBand } from '../logic/serviceClearance'
import bandStyles from '../shared/bands.module.css'
import styles from './CandidateChart.module.css'

export interface ChartedCandidate {
  candidate: FitCandidate
  bands: readonly TemperatureBand[]
}

interface CandidateChartProps {
  charted: readonly ChartedCandidate[]
  /** The required clearance window, µm. */
  window: ClearanceRangeUm
  /** Largest interference accepted at assembly, µm, positive. */
  maxAssemblyInterferenceUm: number
  system: UnitSystem
  bestDesignation: string
  comparedDesignation: string | null
  /** The fit currently set in the calculator, tagged CURRENT. */
  currentDesignation: string
}

export function CandidateChart(props: CandidateChartProps) {
  const { charted, window, maxAssemblyInterferenceUm: limit, system, bestDesignation, comparedDesignation, currentDesignation } = props
  const shown = (um: number) => toDisplay('deviation', system, um)
  const layout = candidateChartLayout({
    candidates: charted.map(({ candidate, bands }) => ({
      designation: candidate.fit.designation,
      bands: bands.map((band) => ({ kind: band.kind, min: shown(band.minUm), max: shown(band.maxUm) })),
    })),
    window: { min: shown(window.minUm), max: shown(window.maxUm) },
    interferenceLimit: shown(limit),
  })
  return (
    <svg className={styles.chart} viewBox={`0 0 ${F.width} ${F.height}`} role="img" aria-label="Clearance of each candidate fit at the service temperatures">
      <rect className={styles.window} x={F.left} width={F.right - F.left} y={layout.windowTop} height={layout.windowBottom - layout.windowTop} />
      {layout.ticks.filter((tick) => tick.value !== 0).map((tick) => (
        <g key={tick.value}>
          <line className={styles.grid} x1={F.left} x2={F.right} y1={tick.y} y2={tick.y} />
          <text className={styles.tick} x={F.left - 10} y={tick.y + 4}>
            {formatQuantity('deviation', system, fromDisplay('deviation', system, tick.value), { signed: true })}
          </text>
        </g>
      ))}
      <line className={styles.windowEdge} x1={F.left} x2={F.right} y1={layout.windowTop} y2={layout.windowTop} />
      <line className={styles.windowEdge} x1={F.left} x2={F.right} y1={layout.windowBottom} y2={layout.windowBottom} />
      <line className={styles.limit} x1={F.left} x2={F.right} y1={layout.interferenceY} y2={layout.interferenceY} />
      <line className={styles.zero} x1={F.left - 6} x2={F.right} y1={layout.zeroY} y2={layout.zeroY} />
      <text className={cx(styles.tick, styles.zeroLabel)} x={F.left - 10} y={layout.zeroY + 4}>
        0
      </text>

      {layout.columns.map((column, index) => {
        const { candidate } = charted[index]
        const designation = column.designation
        const best = designation === bestDesignation
        return (
          <g key={designation}>
            {(best || designation === comparedDesignation) && (
              <rect className={best ? styles.bestSlot : styles.comparedSlot} {...column.slot} />
            )}
            {column.links.map((link, i) => (
              <line key={i} className={styles.link} {...link} />
            ))}
            {column.bars.map((bar) => (
              <rect key={bar.kind} className={cx(bandStyles.mark, bandStyles[bar.kind])} x={bar.x} y={bar.y} width={bar.width} height={bar.height} />
            ))}
            <text className={cx(styles.name, best && styles.bestName)} x={column.x} y={F.nameY}>
              {designation}
            </text>
            <text className={cx(styles.tagline, styles[scoreTone(candidate.score)])} x={column.x} y={F.taglineY}>
              {designation === currentDesignation ? 'CURRENT · ' : 'SCORE '}
              {candidate.score}
            </text>
          </g>
        )
      })}

      {/* Labels last, so their halo keeps them readable over the bands. */}
      <text className={styles.windowLabel} x={F.right - 4} y={layout.windowTop - 6}>
        REQUIRED IN SERVICE {formatQuantityRange('deviation', system, window.minUm, window.maxUm, false)}
      </text>
      <text className={styles.limitLabel} x={F.right - 4} y={layout.interferenceY + 16}>
        MAX ASSEMBLY INTERFERENCE {formatQuantity('deviation', system, -limit)}
      </text>
    </svg>
  )
}
