// The housing and shaft material pickers, fed by the Materials Database, with
// each material's thermal expansion α (the property the fit depends on) and
// where the data comes from.
import { Marker, Select } from '../../../../app/ui'
import { MATERIALS, type Material } from '../../../../core/materials'
import { formatQuantity, type UnitSystem } from '../../../../core/units'
import styles from './shared.module.css'

const OPTIONS = MATERIALS.map((material) => ({ value: material.id, label: material.name }))

interface MaterialPairProps {
  housing: Material
  shaft: Material
  system: UnitSystem
  onHousingChange: (id: string) => void
  onShaftChange: (id: string) => void
}

export function MaterialPair({ housing, shaft, system, onHousingChange, onShaftChange }: MaterialPairProps) {
  const specs = [...new Set([housing.spec, shaft.spec])].join(', ')
  return (
    <>
      <MaterialSelect caption="Housing" color="hole" material={housing} system={system} onChange={onHousingChange} />
      <MaterialSelect caption="Shaft" color="accent" material={shaft} system={system} onChange={onShaftChange} />
      <span className={styles.footnote}>From Materials Database · {specs}</span>
    </>
  )
}

interface MaterialSelectProps {
  caption: string
  color: 'hole' | 'accent'
  material: Material
  system: UnitSystem
  onChange: (id: string) => void
}

function MaterialSelect({ caption, color, material, system, onChange }: MaterialSelectProps) {
  return (
    <Select
      size="md"
      options={OPTIONS}
      value={material.id}
      onChange={onChange}
      aria-label={`${caption} material`}
      leading={
        <>
          <Marker shape="square" color={color} />
          <span className={styles.caption}>{caption}</span>
        </>
      }
      meta={`α ${formatQuantity('expansion', system, material.thermalExpansionUmPerMK, { withUnit: true })}`}
    />
  )
}
