// The plan view of the pattern under the load case on screen (see
// logic/patternPlan): each bolt by its joint type's symbol, ringed in its
// verdict colour with its utilisation u, the shear on it as an arrow, the
// centroid and the load point. Choosing a bolt shows its calculation trail.
// Beside the input steps it is drawn without results: the bolt positions
// only (Bolts step), or with the load and the shear shared by position
// (Load cases step).
import type { KeyboardEvent } from 'react'
import { cx } from '../../../../app/ui'
import type { Result } from '../../../../core/result'
import { formatQuantity, fromDisplay, toDisplay, unitOf, type UnitSystem } from '../../../../core/units'
import type { BoltPatternAnalysis } from '../../pattern'
import { jointSymbolKind } from '../logic/labels'
import { PLAN_FRAME as FRAME, planInputOf, planLayout } from '../logic/patternPlan'
import { formatUtilisation, utilisationTone } from '../logic/verdict'
import { Arrow } from '../shared/Arrow'
import styles from '../shared/diagram.module.css'
import { JointSymbol } from '../shared/JointSymbol'
import type { LoadCaseSpec, PatternSpec } from '../state/boltInputs'

interface PatternPlanProps {
  pattern: PatternSpec
  loadCase: LoadCaseSpec
  /** Omitted: no verdict rings or utilisations, the shear shared by bolt position. */
  analysis?: Result<BoltPatternAnalysis>
  /** false: the bolt positions only, without the load point and the shear. */
  showLoad?: boolean
  system: UnitSystem
  selectedBolt?: string | null
  /** Omitted: a drawing only, as in the report. */
  onSelectBolt?: (id: string) => void
}

export function PatternPlan({ pattern, loadCase, analysis, showLoad = true, system, selectedBolt = null, onSelectBolt }: PatternPlanProps) {
  const result = analysis?.ok ? analysis.value : null
  // Shear in display units, so the legend is a round force in kN or lbf.
  const input = planInputOf(pattern, loadCase, result)
  const shown = (n: number) => (showLoad ? toDisplay('force', system, n) : 0)
  const layout = planLayout({ ...input, bolts: input.bolts.map((b) => ({ ...b, shearX: shown(b.shearX), shearY: shown(b.shearY) })) })
  const resultOf = (id: string) => result?.bolts.find((b) => b.bolt.id === id) ?? null
  const designOf = (jointTypeId: string) => pattern.jointTypes.find((j) => j.id === jointTypeId)?.design
  const { plate, centroid, loadPoint, force, shearScale } = layout
  return (
    <svg className={styles.svg} viewBox={`0 0 ${FRAME.width} ${FRAME.height}`} role="img" aria-label={showLoad ? `Plan of the bolt pattern under ${loadCase.id}` : 'Plan of the bolt positions'}>
      <rect className={styles.plate} x={plate.x} y={plate.y} width={plate.width} height={plate.height} rx={plate.corner} />
      {layout.axes.map((axis, i) => (
        <line key={i} className={styles.centreLine} {...axis} />
      ))}
      <circle className={styles.centroid} cx={centroid.x} cy={centroid.y} r={4} />
      <text className={styles.faintText} x={centroid.x + 8} y={centroid.y + 14}>
        centroid
      </text>

      {layout.bolts.map((bolt, i) => {
        const spec = pattern.bolts[i]
        const design = designOf(spec.jointTypeId)
        const result = resultOf(bolt.id)
        const tone = result ? utilisationTone(result.utilisation, result.status) : 'none'
        return (
          <g
            key={bolt.id}
            className={cx(onSelectBolt && styles.boltHit, styles[tone], bolt.id === selectedBolt && styles.selected)}
            {...(onSelectBolt && {
              role: 'button',
              tabIndex: 0,
              'aria-label': `${bolt.id}, ${spec.jointTypeId}${result ? `, utilisation ${formatUtilisation(result.utilisation)}` : ''}`,
              onClick: () => onSelectBolt(bolt.id),
              onKeyDown: (event: KeyboardEvent) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                onSelectBolt(bolt.id)
              },
            })}
          >
            {bolt.shear && (
              <g className={styles.shear}>
                <Arrow segment={bolt.shear} />
              </g>
            )}
            {design && <JointSymbol kind={jointSymbolKind(design)} cx={bolt.centre.x} cy={bolt.centre.y} radius={bolt.radius} />}
            <text className={cx(styles.text, styles.strong)} x={bolt.centre.x + bolt.radius + 4} y={bolt.centre.y + bolt.radius + 6}>
              {bolt.id}
            </text>
            {result && (
              <text className={styles.toneText} x={bolt.centre.x + bolt.radius + 4} y={bolt.centre.y + bolt.radius + 18}>
                u {formatUtilisation(result.utilisation)}
              </text>
            )}
          </g>
        )
      })}

      {showLoad && (
        <g className={styles.axial}>
          {force && <Arrow segment={force} />}
          <circle className={styles.loadPoint} cx={loadPoint.x} cy={loadPoint.y} r={5} />
          <text className={styles.arrowLabel} x={loadPoint.x + 8} y={loadPoint.y - 8}>
            load point
          </text>
        </g>
      )}

      {shearScale && (
        <g className={styles.shear}>
          <line className={styles.arrow} x1={FRAME.width - 24 - shearScale.lengthPx} y1={FRAME.height - 18} x2={FRAME.width - 24} y2={FRAME.height - 18} />
          <text className={cx(styles.faintText, styles.end)} x={FRAME.width - 24} y={FRAME.height - 26}>
            shear {formatQuantity('force', system, fromDisplay('force', system, shearScale.force))} {unitOf('force', system)}
          </text>
        </g>
      )}
      <g>
        <line className={styles.axis} x1={20} y1={FRAME.height - 16} x2={50} y2={FRAME.height - 16} />
        <line className={styles.axis} x1={20} y1={FRAME.height - 16} x2={20} y2={FRAME.height - 46} />
        <text className={styles.faintText} x={54} y={FRAME.height - 13}>
          x
        </text>
        <text className={styles.faintText} x={17} y={FRAME.height - 50}>
          y
        </text>
      </g>
    </svg>
  )
}
