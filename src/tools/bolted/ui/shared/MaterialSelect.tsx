// A material picker fed by the Materials Database, with the material
// family's colour as used in the section drawing.
import { Marker, Select } from '../../../../app/ui'
import { MATERIALS } from '../../../../core/materials'
import { materialFamily } from '../logic/labels'

const OPTIONS = MATERIALS.map((material) => ({ value: material.id, label: material.name }))

interface MaterialSelectProps {
  /** Accessible name, e.g. "Plate 1 material". */
  label: string
  materialId: string
  onChange: (materialId: string) => void
  meta?: string
}

export function MaterialSelect({ label, materialId, onChange, meta }: MaterialSelectProps) {
  return (
    <Select
      size="md"
      aria-label={label}
      options={OPTIONS}
      value={materialId}
      onChange={onChange}
      leading={<Marker shape="square" color={`cat-${materialFamily(materialId)}`} />}
      meta={meta}
    />
  )
}
