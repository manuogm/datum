// Contact (advanced inputs of the clamped parts): the limiting surface
// pressure pG of each metal part, left empty for the table value or the
// estimate from its Rm; the surface roughness behind embedding; and where the
// axial load enters the clamped parts.
import { PanelSection, Select } from '../../../../app/ui'
import { formatDecimal, type UnitSystem } from '../../../../core/units'
import { LOAD_INTRODUCTION_FACTOR, type LoadIntroductionPosition, type SurfaceRoughness } from '../../calc'
import { needsLimitingPressure, withLimitingPressure } from '../logic/designEdits'
import { LOAD_INTRODUCTION_LABELS, optionsOf, ROUGHNESS_LABELS } from '../logic/labels'
import type { JointDesignSpec } from '../state/boltInputs'
import { PressureField } from './PressureField'

const ROUGHNESS = optionsOf<SurfaceRoughness>(ROUGHNESS_LABELS)
const POSITIONS = optionsOf<LoadIntroductionPosition>(LOAD_INTRODUCTION_LABELS)

interface ContactFieldsProps {
  design: JointDesignSpec
  system: UnitSystem
  onChange: (changes: Partial<JointDesignSpec>) => void
}

export function ContactFields({ design, system, onChange }: ContactFieldsProps) {
  const { plates } = design
  return (
    <PanelSection label="Contact">
      {plates.map((plate, i) =>
        needsLimitingPressure(plate.materialId) ? null : (
          <PressureField
            key={i}
            plate={plate}
            label={`Part ${i + 1}`}
            system={system}
            onChange={(pG) => onChange({ plates: plates.map((p, j) => (j === i ? withLimitingPressure(p, pG) : p)) })}
          />
        ),
      )}
      <Select
        size="md"
        aria-label="Surface roughness"
        options={ROUGHNESS}
        value={design.surfaceRoughness}
        onChange={(surfaceRoughness) => onChange({ surfaceRoughness })}
        meta="embedding"
      />
      <Select
        size="md"
        aria-label="Load introduction"
        options={POSITIONS}
        value={design.loadIntroduction}
        onChange={(loadIntroduction) => onChange({ loadIntroduction })}
        meta={`n ${formatDecimal(LOAD_INTRODUCTION_FACTOR[design.loadIntroduction], 1, true)}`}
      />
    </PanelSection>
  )
}
