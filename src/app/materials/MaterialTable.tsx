// MaterialTable: the materials passing the filters with their key
// properties in the viewer's units. Choosing a row shows it in the detail
// column.
import type { Material } from '../../core/materials'
import type { UnitSystem } from '../../core/units'
import { cx, Marker } from '../ui'
import { formatMaterialValue, materialUnit, type MaterialQuantity } from './materialUnits'
import styles from './MaterialTable.module.css'

const COLUMNS: readonly { label: string; quantity: MaterialQuantity; value: (m: Material) => number | null }[] = [
  { label: 'ρ', quantity: 'density', value: (m) => m.densityGPerCm3 },
  { label: 'E', quantity: 'modulus', value: (m) => m.youngsModulusGPa },
  { label: 'Rp0.2', quantity: 'strength', value: (m) => m.yieldStrengthMPa },
  { label: 'α', quantity: 'expansion', value: (m) => m.thermalExpansionUmPerMK },
  { label: 'T max', quantity: 'temperature', value: (m) => m.maxServiceTempC },
]

function cellText(value: number | null, quantity: MaterialQuantity, system: UnitSystem): string {
  return value === null ? '—' : formatMaterialValue(quantity, system, value)
}

interface MaterialTableProps {
  materials: readonly Material[]
  selectedId: string | null
  onSelect: (id: string) => void
  unitSystem: UnitSystem
}

export function MaterialTable({ materials, selectedId, onSelect, unitSystem }: MaterialTableProps) {
  return (
    <table className={styles.table} aria-label="Materials">
      <colgroup>
        <col className={styles.nameCol} />
        <col className={styles.specCol} />
        {COLUMNS.map((c) => (
          <col key={c.label} className={styles.numberCol} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th>Material</th>
          <th>Spec</th>
          {COLUMNS.map((c) => (
            <th key={c.label} className={styles.number}>
              {c.label}
              <span className={styles.unit}>{materialUnit(c.quantity, unitSystem)}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {materials.map((m) => {
          const selected = m.id === selectedId
          return (
            <tr key={m.id} className={cx(selected && styles.selected)} onClick={() => onSelect(m.id)}>
              <td>
                <button type="button" className={styles.name} aria-pressed={selected} onClick={() => onSelect(m.id)}>
                  <Marker shape="dot" size={7} color={`cat-${m.family}`} />
                  {m.name}
                </button>
              </td>
              <td className={styles.spec}>{m.spec}</td>
              {COLUMNS.map((c) => (
                <td key={c.label} className={styles.number}>
                  {cellText(c.value(m), c.quantity, unitSystem)}
                </td>
              ))}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
