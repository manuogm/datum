// Every input of one joint design, shared by the single joint and the joint
// types of a pattern.
import type { UnitSystem } from '../../../../core/units'
import type { JointDesignSpec } from '../state/boltInputs'
import { BoltFields } from './BoltFields'
import { JointKindFields } from './JointKindFields'
import { PlatesFields } from './PlatesFields'
import { TighteningFields } from './TighteningFields'

interface DesignInputsProps {
  design: JointDesignSpec
  system: UnitSystem
  clampLengthMm: number | null
  onChange: (changes: Partial<JointDesignSpec>) => void
}

export function DesignInputs({ design, system, clampLengthMm, onChange }: DesignInputsProps) {
  return (
    <>
      <BoltFields design={design} onChange={onChange} />
      <JointKindFields design={design} system={system} onChange={onChange} />
      <PlatesFields design={design} system={system} clampLengthMm={clampLengthMm} onChange={onChange} />
      <TighteningFields design={design} onChange={onChange} />
    </>
  )
}
