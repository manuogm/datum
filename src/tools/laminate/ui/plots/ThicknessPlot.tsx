// Ply by ply through the thickness: the chosen stress, strain or failure
// index of every ply from its top face to its bottom face, coloured by the
// ply's reserve factor against the target. The failure index view marks
// FI = 1 (first-ply failure) and 1/target.
import { cx, type Status } from '../../../../app/ui'
import { formatDecimal, formatQuantity, unitOf, type UnitSystem } from '../../../../core/units'
import { plyBoundariesMm, type LaminateAnalysis } from '../../calc'
import { formatFactor } from '../logic/labels'
import { componentUnit, PLOT_COMPONENTS, pointValue, THICKNESS_FRAME as FRAME, thicknessLayout, type PlotComponent } from '../logic/thicknessPlot'
import { plyTones } from '../logic/verdict'
import styles from './plots.module.css'

interface ThicknessPlotProps {
  analysis: Pick<LaminateAnalysis, 'plies' | 'layup' | 'firstPlyFailure'>
  component: PlotComponent
  system: UnitSystem
  selectedPly?: number | null
}

const TONE_CLASS: Record<Status, string> = { ok: styles.okBar, warn: styles.warnBar, bad: styles.badBar }

export function ThicknessPlot({ analysis, component, system, selectedPly = null }: ThicknessPlotProps) {
  const { plies, layup, firstPlyFailure } = analysis
  const target = firstPlyFailure.targetReserveFactor
  const tones = plyTones(analysis)
  const faces = plyBoundariesMm(plies.map((p) => p.thicknessMm))
  const layout = thicknessLayout(
    plies.map((ply, i) => ({
      index: ply.index,
      ...faces[i],
      top: pointValue(ply.top, component, system),
      bottom: pointValue(ply.bottom, component, system),
      tone: tones[i],
    })),
    layup.thicknessMm,
    component === 'fi' ? [1 / target, 1] : [],
  )
  const decimals = component === 'fi' || component === 'ex' ? 2 : system === 'si' ? 0 : 1
  const value = (v: number) => formatDecimal(v, decimals, component === 'fi' || component === 'ex')
  const unit = componentUnit(component, system)
  const symbol = PLOT_COMPONENTS.find((c) => c.value === component)?.label
  return (
    <svg className={styles.svg} viewBox={`0 0 ${FRAME.width} ${FRAME.height}`} role="img" aria-label="Ply values through the thickness">
      {layout.valueTicks.map((tick) => (
        <g key={tick.value}>
          <line className={styles.grid} x1={tick.x} x2={tick.x} y1={FRAME.top} y2={FRAME.bottom} />
          <text className={cx(styles.tickText, styles.middle)} x={tick.x} y={FRAME.bottom + 16}>
            {formatDecimal(tick.value, 3)}
          </text>
        </g>
      ))}
      {layout.bars.map((bar) => (
        <polygon key={bar.index} className={cx(styles.bar, TONE_CLASS[bar.tone], bar.index === selectedPly && styles.selectedBar)} points={bar.points} />
      ))}
      {layout.bars.map(
        (bar) =>
          bar.label && (
            <text key={bar.index} className={cx(styles.valueText, bar.label.anchor === 'end' && styles.end)} x={bar.label.x} y={bar.label.y}>
              {value(bar.label.value)}
            </text>
          ),
      )}
      <line className={styles.midplane} x1={FRAME.left - 4} x2={FRAME.right} y1={layout.midplaneY} y2={layout.midplaneY} />
      <line className={styles.axisLine} x1={layout.zeroX} x2={layout.zeroX} y1={FRAME.top} y2={FRAME.bottom} />
      <line className={styles.axisLine} x1={FRAME.left} x2={FRAME.right} y1={FRAME.bottom} y2={FRAME.bottom} />
      {layout.references.map((ref, i) => (
        <g key={ref.value}>
          <line className={i === layout.references.length - 1 ? styles.failLine : styles.targetLine} x1={ref.x} x2={ref.x} y1={FRAME.top - 6} y2={FRAME.bottom} />
          <text className={cx(styles.tickText, styles.middle)} x={ref.x} y={FRAME.top - 10}>
            {i === layout.references.length - 1 ? 'fail' : `1/${formatFactor(target)}`}
          </text>
        </g>
      ))}
      {layout.zTicks.map((tick) => (
        <text key={tick.zMm} className={cx(styles.tickText, styles.end)} x={FRAME.left - 8} y={tick.y + 3.5}>
          {tick.zMm === 0 ? '0' : formatQuantity('length', system, tick.zMm, { signed: true })}
        </text>
      ))}
      <text className={cx(styles.tickText, styles.end)} x={FRAME.left - 8} y={FRAME.top - 22}>
        z {unitOf('length', system)}
      </text>
      <text className={cx(styles.tickText, styles.end)} x={FRAME.right} y={FRAME.bottom + 34}>
        {component === 'fi' ? 'failure index' : `${symbol} ${unit}`}
      </text>
    </svg>
  )
}
