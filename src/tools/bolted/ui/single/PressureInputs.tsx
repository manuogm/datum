// pG of the polymer and composite parts, offered inside R10 of the trail
// where the check asks for it, so it can be entered without leaving the result.
import type { UnitSystem } from '../../../../core/units'
import { needsLimitingPressure, withLimitingPressure } from '../logic/designEdits'
import { PressureField } from '../shared/PressureField'
import type { JointDesignSpec } from '../state/boltInputs'

interface PressureInputsProps {
  design: JointDesignSpec
  system: UnitSystem
  onChange: (changes: Partial<JointDesignSpec>) => void
}

export function PressureInputs({ design, system, onChange }: PressureInputsProps) {
  const { plates } = design
  return plates.map((plate, i) =>
    needsLimitingPressure(plate.materialId) ? (
      <PressureField
        key={i}
        plate={plate}
        label={`Part ${i + 1}`}
        system={system}
        onChange={(pG) => onChange({ plates: plates.map((p, j) => (j === i ? withLimitingPressure(p, pG) : p)) })}
      />
    ) : null,
  )
}
