// Section A–A beside the Joint step: the drawing to scale with its numbered
// part list, so each part entered shows up as it is typed.
import { formatDecimal, formatQuantity, unitOf, type UnitSystem } from '../../../../core/units'
import type { BoltedJointAnalysis } from '../../calc'
import { materialName } from '../logic/labels'
import styles from '../shared/steps.module.css'
import type { JointDesignSpec } from '../state/boltInputs'
import { SectionDiagram } from './SectionDiagram'

interface JointSectionProps {
  analysis: BoltedJointAnalysis
  design: JointDesignSpec
  system: UnitSystem
}

export function JointSection({ analysis, design, system }: JointSectionProps) {
  const length = (mm: number) => `${formatQuantity('length', system, mm)} ${unitOf('length', system)}`
  return (
    <figure className={styles.figure}>
      <SectionDiagram analysis={analysis} design={design} />
      <ol className={styles.legend}>
        {design.plates.map((plate, i) => (
          <li key={i}>
            {i + 1} {materialName(plate.materialId)} · {length(plate.thicknessMm)}
          </li>
        ))}
        {design.joint.kind !== 'through-bolt' && (
          <li>
            {design.plates.length + 1} {materialName(design.joint.materialId)} · tapped {length(design.joint.engagementMm)}
          </li>
        )}
        <li>
          pressure cone φ {formatDecimal(analysis.resilience.coneAngleDeg, 1, true)}° · DA {length(design.outerDiameterMm)}
        </li>
      </ol>
    </figure>
  )
}
