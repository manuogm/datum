// The exploded ply stack: every ply in isometric view with its fibres drawn
// at the ply angle, numbered from the top. A ply below the target is filled in
// its status colour (the same rule as the failure index bars), the critical
// plies get a heavy outline, and the ply chosen in the list is drawn in the
// accent colour.
import { useId } from 'react'
import { cx, type Status } from '../../../../app/ui'
import { angleText } from '../logic/labels'
import { distinctAngles, fibreRotation, LEADER, PLY_HALF_SIDE, STACK_FRAME, stackLayout, X_ARROW } from '../logic/stackPlot'
import styles from './plots.module.css'

interface StackPlotProps {
  anglesDeg: readonly number[]
  /** Status of each ply, top ply first; ok plies are drawn neutral. */
  tones: readonly Status[]
  criticalPlies: readonly number[]
  selectedPly?: number | null
  onSelect?: (index: number) => void
}

const SIDE = PLY_HALF_SIDE * 2
const HATCH = 5
const SHADOW_OFFSET = 4
const TONE_CLASS: Record<Status, string | undefined> = { ok: undefined, warn: styles.warn, bad: styles.bad }

export function StackPlot({ anglesDeg, tones, criticalPlies, selectedPly = null, onSelect }: StackPlotProps) {
  // useId() contains characters that do not survive in url(#…); keep letters and digits.
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const patternId = (angle: number) => `lam${id}-fibre-${angle < 0 ? 'm' : ''}${String(Math.abs(angle)).replace('.', '_')}`
  const plies = stackLayout(anglesDeg, criticalPlies)
  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${STACK_FRAME.width} ${STACK_FRAME.height}`}
      role="img"
      aria-label={`Exploded ply stack, ${anglesDeg.length} plies, top ply first`}
    >
      <defs>
        {distinctAngles(anglesDeg).map((angle) => (
          <pattern key={angle} id={patternId(angle)} width={HATCH} height={HATCH} patternUnits="userSpaceOnUse" patternTransform={fibreRotation(angle)}>
            <line className={styles.fibre} x1={0} y1={HATCH / 2} x2={HATCH} y2={HATCH / 2} />
          </pattern>
        ))}
      </defs>
      {plies.map((ply) => {
        const selected = ply.index === selectedPly
        const tone = selected ? styles.selected : TONE_CLASS[tones[ply.index - 1]]
        return (
          <g key={ply.index} className={cx(styles.ply, tone, ply.critical && styles.critical)} onClick={onSelect && (() => onSelect(ply.index))}>
            <g transform={ply.transform}>
              <rect className={styles.plyShadow} x={-PLY_HALF_SIDE + SHADOW_OFFSET} y={-PLY_HALF_SIDE + SHADOW_OFFSET} width={SIDE} height={SIDE} />
              <rect className={styles.plyFace} x={-PLY_HALF_SIDE} y={-PLY_HALF_SIDE} width={SIDE} height={SIDE} />
              <rect className={styles.plyFibres} x={-PLY_HALF_SIDE} y={-PLY_HALF_SIDE} width={SIDE} height={SIDE} fill={`url(#${patternId(ply.angleDeg)})`} />
            </g>
            {ply.labelled && (
              <>
                <line className={styles.leader} x1={LEADER.x1} x2={LEADER.x2} y1={ply.cy} y2={ply.cy} />
                <text className={styles.plyLabel} x={LEADER.labelX} y={ply.cy + 4}>
                  {ply.index}
                  <tspan dx={8}>{angleText(ply.angleDeg)}°</tspan>
                </text>
              </>
            )}
          </g>
        )
      })}
      <line className={styles.arrow} x1={X_ARROW.x1} y1={X_ARROW.y1} x2={X_ARROW.x2} y2={X_ARROW.y2} />
      <polygon className={styles.arrowHead} points={X_ARROW.head} />
      <text className={styles.axisLabel} x={X_ARROW.labelX} y={X_ARROW.labelY}>
        x · 0°
      </text>
    </svg>
  )
}
