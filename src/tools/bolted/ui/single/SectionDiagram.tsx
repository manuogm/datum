// Section A–A of the joint, to scale (see logic/sectionDiagram): bolt, nut or
// tapped part, washers, hatched plates in their material family's colour and
// the pressure cone, with the axial and transverse loads as arrows.
import { useId, type CSSProperties } from 'react'
import { markerColor } from '../../../../app/ui'
import type { MaterialFamily } from '../../../../core/materials'
import { formatDecimal } from '../../../../core/units'
import type { BoltedJointAnalysis } from '../../calc'
import { SECTION_FRAME as FRAME, sectionInputOf, sectionLayout } from '../logic/sectionDiagram'
import { Arrow } from '../shared/Arrow'
import styles from '../shared/diagram.module.css'
import type { JointDesignSpec } from '../state/boltInputs'

interface SectionDiagramProps {
  analysis: BoltedJointAnalysis
  design: JointDesignSpec
}

export function SectionDiagram({ analysis, design }: SectionDiagramProps) {
  const hatchId = useId()
  const layout = sectionLayout(sectionInputOf(analysis, design))
  const families = [...new Set(layout.parts.map((p) => p.family))]
  const hatch = (family: MaterialFamily) => `${hatchId}-${family}`
  const familyStyle = (family: MaterialFamily) => ({ '--family': markerColor(`cat-${family}`) }) as CSSProperties
  const { arrows } = layout
  return (
    <svg className={styles.svg} viewBox={`0 0 ${FRAME.width} ${FRAME.height}`} role="img" aria-label={`Section of the joint, pressure cone at ${formatDecimal(analysis.resilience.coneAngleDeg, 1)}°`}>
      <defs>
        {families.map((family) => (
          <pattern key={family} id={hatch(family)} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)" style={familyStyle(family)}>
            <line className={styles.hatch} x1="0" y1="0" x2="0" y2="6" />
          </pattern>
        ))}
      </defs>
      {layout.parts.map(({ rect, family }, i) => (
        <rect key={i} className={styles.part} style={{ ...familyStyle(family), fill: `url(#${hatch(family)})` }} {...rect} />
      ))}
      <rect className={styles.hole} {...layout.hole} />
      {layout.cone.map((points, i) => (
        <polygon key={i} className={styles.cone} points={points.map((p) => `${p.x},${p.y}`).join(' ')} />
      ))}
      {layout.insert && <rect className={styles.insert} {...layout.insert} />}
      {layout.washers.map((rect, i) => (
        <rect key={i} className={styles.steel} {...rect} />
      ))}
      <rect className={styles.steel} {...layout.head} />
      {layout.nut && <rect className={styles.steel} {...layout.nut} />}
      <rect className={styles.steel} {...layout.shank} />
      {layout.engagement && <rect className={styles.thread} {...layout.engagement} />}
      <line className={styles.centreLine} {...layout.axis} />
      {layout.parts.map(({ rect }, i) => (
        <text key={i} className={styles.faintText} x={rect.x + rect.width - 4} y={rect.y + Math.min(rect.height - 3, 12)} textAnchor="end">
          {i + 1}
        </text>
      ))}
      <g className={styles.axial}>
        <Arrow segment={arrows.axialTop} />
        <Arrow segment={arrows.axialBottom} />
        <text className={styles.arrowLabel} x={arrows.axialTop.x2 + 6} y={arrows.axialTop.y2 + 8}>
          FA
        </text>
      </g>
      <g className={styles.shear}>
        <Arrow segment={arrows.shearTop} />
        <Arrow segment={arrows.shearBottom} />
        <text className={styles.arrowLabel} x={arrows.shearTop.x1} y={arrows.shearTop.y1 - 6}>
          FQ
        </text>
      </g>
    </svg>
  )
}

