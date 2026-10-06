// The fit spectrum: the fit's clearance band at each service temperature on
// one clearance axis, against the required window (if set), so the effect of
// temperature is seen at a glance. It sits beside the service step and under
// the zone diagram in the results' details.
import type { CSSProperties } from 'react'
import { cx, MonoLabel } from '../../../../app/ui'
import { formatQuantity, fromDisplay, toDisplay, unitOf, type UnitSystem } from '../../../../core/units'
import type { ServiceClearance } from '../logic/serviceClearance'
import { spectrumLayout, type Span } from '../logic/spectrum'
import { BandLegend } from '../shared/BandLegend'
import bandStyles from '../shared/bands.module.css'
import type { FitInputs } from '../state/fitInputs'
import styles from './calculator.module.css'

interface FitSpectrumProps {
  service: ServiceClearance
  window: FitInputs['requiredClearanceUm']
  system: UnitSystem
  /** Without its own title, rule and padding, inside a container that gives them (a step's side column). */
  bare?: boolean
}

const spanStyle = ({ left, width }: Span): CSSProperties => ({ left: `${left}%`, width: `${width}%` })

export function FitSpectrum({ service, window, system, bare = false }: FitSpectrumProps) {
  const shown = (um: number) => toDisplay('deviation', system, um)
  const layout = spectrumLayout(
    service.bands.map((band) => ({ kind: band.kind, min: shown(band.minUm), max: shown(band.maxUm) })),
    window === null ? null : { min: shown(window.minUm), max: shown(window.maxUm) },
  )
  const lastTick = layout.ticks.length - 1
  return (
    <div className={cx(styles.spectrum, bare && styles.bare)}>
      <div className={styles.spectrumHead}>
        {!bare && <MonoLabel>Fit spectrum</MonoLabel>}
        <span className={styles.legend}>
          <BandLegend bands={service.bands} system={system} />
        </span>
      </div>
      <div className={styles.track} style={{ '--rows': service.bands.length } as CSSProperties}>
        <div className={styles.interferenceZone} style={{ width: `${layout.zeroPercent}%` }}>
          INTERFERENCE
        </div>
        <span className={styles.clearanceLabel} style={{ left: `${layout.zeroPercent}%` }}>
          CLR
        </span>
        {layout.window && <div className={styles.window} style={spanStyle(layout.window)} />}
        <div className={styles.zeroLine} style={{ left: `${layout.zeroPercent}%` }} />
        {layout.bars.map((bar, row) => (
          <div
            key={bar.kind}
            className={cx(styles.bar, bandStyles.strip, bandStyles[bar.kind])}
            style={{ ...spanStyle(bar), '--row': row } as CSSProperties}
          />
        ))}
      </div>
      <div className={styles.axis}>
        {layout.ticks.map((tick, i) => (
          <span key={tick.value} className={cx(styles.axisTick, tick.value === 0 && styles.axisZero)} style={{ left: `${tick.percent}%` }}>
            {formatQuantity('deviation', system, fromDisplay('deviation', system, tick.value))}
            {i === lastTick && ` ${unitOf('deviation', system)}`}
          </span>
        ))}
      </div>
    </div>
  )
}
