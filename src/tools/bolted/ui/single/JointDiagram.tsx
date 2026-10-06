// The joint diagram (force against elongation) at the lowest preload in
// service, from logic/jointDiagram: how FA,max splits between the bolt and
// the clamped parts, and where the parts would separate.
import { cx } from '../../../../app/ui'
import { formatDecimal, formatQuantity, fromDisplay, toDisplay, unitOf, type UnitSystem } from '../../../../core/units'
import type { BoltedJointAnalysis } from '../../calc'
import { JOINT_DIAGRAM_FRAME as FRAME, jointDiagramLayout } from '../logic/jointDiagram'
import styles from '../shared/diagram.module.css'

interface JointDiagramProps {
  analysis: BoltedJointAnalysis
  axialN: number
  system: UnitSystem
}

export function JointDiagram({ analysis, axialN, system }: JointDiagramProps) {
  // Forces in display units, so the force axis has round ticks in kN or lbf.
  const shown = (n: number) => toDisplay('force', system, n)
  const layout = jointDiagramLayout({
    boltResilience: analysis.resilience.boltMmPerN / shown(1),
    loadFactor: analysis.loadFactor,
    preload: shown(analysis.preload.serviceMinN),
    axial: shown(axialN),
  })
  const force = (displayed: number) => formatQuantity('force', system, fromDisplay('force', system, displayed))
  const { bolt, parts, load, residual, preload, separation, forces } = layout
  // Low on the parts line, below the FKR label and above the separation point.
  const partsLabel = { x: parts.x1 + 0.85 * (parts.x2 - parts.x1) + 8, y: parts.y1 + 0.85 * (parts.y2 - parts.y1) - 6 }
  const guide = (y: number, toX: number) => <line className={styles.guide} x1={FRAME.left} y1={y} x2={toX} y2={y} />
  return (
    <svg className={styles.svg} viewBox={`0 0 ${FRAME.width} ${FRAME.height}`} role="img" aria-label="Joint diagram: force against elongation">
      {layout.forceTicks.map((tick) => (
        <g key={tick.value}>
          <line className={styles.grid} x1={FRAME.left} x2={FRAME.right} y1={tick.y} y2={tick.y} />
          <text className={cx(styles.faintText, styles.end)} x={FRAME.left - 6} y={tick.y + 3}>
            {force(tick.value)}
          </text>
        </g>
      ))}
      <text className={cx(styles.faintText, styles.end)} x={FRAME.left - 6} y={FRAME.top - 10}>
        {unitOf('force', system)}
      </text>
      <line className={styles.axis} x1={FRAME.left} y1={FRAME.bottom} x2={FRAME.right} y2={FRAME.bottom} />
      <line className={styles.axis} x1={FRAME.left} y1={FRAME.top} x2={FRAME.left} y2={FRAME.bottom} />
      <text className={cx(styles.faintText, styles.end)} x={FRAME.right} y={FRAME.bottom + 28}>
        elongation f →
      </text>

      {guide(preload.y, preload.x)}
      {guide(load.y2, load.x2)}
      <line className={styles.boltLine} {...bolt} />
      <line className={styles.partsLine} {...parts} />
      <g className={styles.axial}>
        <line className={styles.arrow} {...load} />
        <text className={styles.arrowLabel} x={load.x1 + 6} y={(load.y1 + load.y2) / 2 + 4}>
          FA {force(shown(axialN))}
        </text>
      </g>
      {!layout.separated && (
        <g className={styles.residual}>
          <line className={styles.arrow} {...residual} />
          <text className={styles.arrowLabel} x={residual.x1 + 6} y={(residual.y1 + residual.y2) / 2 + 4}>
            FKR {force(forces.residual)}
          </text>
        </g>
      )}
      <circle className={styles.point} cx={preload.x} cy={preload.y} r={3.5} />
      <circle className={styles.separation} cx={separation.x} cy={separation.y} r={3.5} />

      <text className={cx(styles.text, styles.strong)} x={FRAME.left + 4} y={preload.y - 5}>
        FV,min {force(forces.preload)}
      </text>
      <text className={cx(styles.text, styles.end)} x={load.x2 - 8} y={load.y2 - 6}>
        FS at FV,min {force(forces.bolt)}
      </text>
      <text className={cx(styles.faintText, styles.badText, styles.end)} x={separation.x + 4} y={separation.y + 15}>
        separation at FA {force(forces.separationAxial)}
      </text>
      <text className={styles.faintText} x={(bolt.x1 + bolt.x2) / 2 - 30} y={(bolt.y1 + bolt.y2) / 2}>
        bolt
      </text>
      <text className={styles.faintText} x={partsLabel.x} y={partsLabel.y}>
        parts
        <tspan x={partsLabel.x} dy={12}>
          (n = {formatDecimal(analysis.loadIntroductionFactor, 2, true)})
        </tspan>
      </text>
    </svg>
  )
}
