// PropertyChart: Young's modulus against density on log–log axes, one dot
// per material in its family colour. Materials outside the filters fade;
// the selected one is drawn in the accent colour. Click a dot to select it.
// The dashed line joins materials of equal specific stiffness E/ρ = 25.
import type { KeyboardEvent } from 'react'
import type { Material } from '../../core/materials'
import { cx, markerColor } from '../ui'
import styles from './PropertyChart.module.css'

// Plot area in viewBox units (760 × 410).
const LEFT = 70
const RIGHT = 740
const TOP = 20
const BOTTOM = 360
const X_DECADES = 1 // density 1 … 10 g/cm³
const Y_MAX_GPA = 300 // modulus 1 … 300 GPa

const x = (density: number) => LEFT + (Math.log10(density) / X_DECADES) * (RIGHT - LEFT)
const y = (modulus: number) => BOTTOM - (Math.log10(Math.max(modulus, 1)) / Math.log10(Y_MAX_GPA)) * (BOTTOM - TOP - 10)

const X_TICKS = [1, 2, 5, 10]
const Y_TICKS = [1, 10, 100]
const SPECIFIC_STIFFNESS = 25

/** Materials named on the chart, with a vertical label offset where neighbours crowd (end-anchored when set). */
const LABELS: Record<string, number | null> = {
  'al-7075-t6': null,
  'ti-6al-4v': null,
  'steel-42crmo4-qt': -6,
  'ni-718': 14,
  'cfrp-ud-0': null,
  peek: null,
  'mg-az31b': null,
  'cu-etp': 16,
}

interface PropertyChartProps {
  materials: readonly Material[]
  isShown: (material: Material) => boolean
  selectedId: string | null
  onSelect: (id: string) => void
}

export function PropertyChart({ materials, isShown, selectedId, onSelect }: PropertyChartProps) {
  const onKey = (id: string) => (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(id)
    }
  }
  return (
    <svg
      className={styles.chart}
      viewBox="0 0 760 410"
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-label="Young's modulus against density, log scales"
    >
      {X_TICKS.map((t) => (
        <g key={`x${t}`}>
          <line className={styles.grid} x1={x(t)} x2={x(t)} y1={TOP} y2={BOTTOM} />
          <text className={styles.tick} x={x(t)} y={378} textAnchor="middle">
            {t}
          </text>
        </g>
      ))}
      {Y_TICKS.map((t) => (
        <g key={`y${t}`}>
          <line className={styles.grid} x1={LEFT} x2={RIGHT} y1={y(t)} y2={y(t)} />
          <text className={styles.tick} x={62} y={y(t) + 4} textAnchor="end">
            {t}
          </text>
        </g>
      ))}
      <line className={styles.axis} x1={LEFT} x2={LEFT} y1={TOP} y2={BOTTOM} />
      <line className={styles.axis} x1={LEFT} x2={RIGHT} y1={BOTTOM} y2={BOTTOM} />
      <text className={styles.axisLabel} x={RIGHT} y={398} textAnchor="end">
        DENSITY ρ · g/cm³
      </text>
      <text className={styles.axisLabel} x={76} y={30}>
        YOUNG'S MODULUS E · GPa
      </text>
      <line
        className={styles.guide}
        x1={x(1)}
        y1={y(SPECIFIC_STIFFNESS)}
        x2={x(10)}
        y2={y(SPECIFIC_STIFFNESS * 10)}
      />
      <text className={styles.guideLabel} x={x(1.1)} y={y(SPECIFIC_STIFFNESS) - 8}>
        E/ρ = {SPECIFIC_STIFFNESS} · equal specific stiffness
      </text>
      {materials.map((m) => {
        const selected = m.id === selectedId
        const px = x(m.densityGPerCm3)
        const py = y(m.youngsModulusGPa)
        const offset = LABELS[m.id]
        return (
          <g
            key={m.id}
            className={cx(styles.point, !isShown(m) && styles.faded, selected && styles.selected)}
            role="button"
            tabIndex={0}
            aria-label={`${m.name}: ρ ${m.densityGPerCm3} g/cm³, E ${m.youngsModulusGPa} GPa`}
            aria-pressed={selected}
            onClick={() => onSelect(m.id)}
            onKeyDown={onKey(m.id)}
          >
            <circle
              cx={px}
              cy={py}
              r={selected ? 7 : 5}
              style={{ fill: selected ? markerColor('accent') : markerColor(`cat-${m.family}`) }}
            />
            {(m.id in LABELS || selected) && (
              <text
                className={styles.label}
                x={px + (offset == null ? 10 : -10)}
                y={py + (offset ?? 4)}
                textAnchor={offset == null ? 'start' : 'end'}
              >
                {m.name}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
