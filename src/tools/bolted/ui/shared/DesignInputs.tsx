// Every input of one joint design, for a joint type of a pattern: the bolt,
// what it screws into and the clamped parts, with the tightening and contact
// inputs under More options. (The single joint spreads the same fields over
// its Bolt and Joint steps.)
import { MoreOptions } from '../../../../app/ui'
import type { UnitSystem } from '../../../../core/units'
import { contactOptions, tighteningOptions } from '../logic/designOptions'
import type { JointDesignSpec } from '../state/boltInputs'
import { BoltFields } from './BoltFields'
import { ContactFields } from './ContactFields'
import { JointKindFields } from './JointKindFields'
import { PlatesFields } from './PlatesFields'
import { TighteningFields } from './TighteningFields'

interface DesignInputsProps {
  design: JointDesignSpec
  system: UnitSystem
  onChange: (changes: Partial<JointDesignSpec>) => void
}

export function DesignInputs({ design, system, onChange }: DesignInputsProps) {
  const tightening = tighteningOptions(design)
  const contact = contactOptions(design)
  return (
    <>
      <BoltFields design={design} onChange={onChange} />
      <JointKindFields design={design} system={system} onChange={onChange} />
      <PlatesFields design={design} system={system} clampLengthMm={null} onChange={onChange} />
      <MoreOptions count={tightening.count + contact.count} changed={tightening.changed + contact.changed}>
        <TighteningFields design={design} onChange={onChange} />
        <ContactFields design={design} system={system} onChange={onChange} />
      </MoreOptions>
    </>
  )
}
