// Running loads per unit width, one kind at a time: the in-plane forces Nx,
// Ny, Nxy or the moments Mx, My, Mxy, in the CLT sign convention. The unit
// is in the head, not in the fields: lbf·in/in would leave no room for the
// value.
import { QuantityField } from '../../../../app/ui'
import { unitOf, type UnitSystem } from '../../../../core/units'
import { LOAD_COMPONENTS, type LoadComponent } from '../logic/loads'
import type { LoadSpec } from '../state/lamInputs'
import styles from './editor.module.css'

interface LoadsFieldsProps {
  /** Forces (lineLoad) or moments (lineMoment). */
  quantity: LoadComponent['quantity']
  loads: LoadSpec
  system: UnitSystem
  onChange: (changes: Partial<LoadSpec>) => void
}

export function LoadsFields({ quantity, loads, system, onChange }: LoadsFieldsProps) {
  const unit = unitOf(quantity, system)
  return (
    <div className={styles.loads}>
      <span className={styles.loadsHead}>
        {quantity === 'lineLoad' ? 'N' : 'M'} · {unit}
      </span>
      {LOAD_COMPONENTS.filter((c) => c.quantity === quantity).map(({ key, symbol }) => (
        <QuantityField
          key={key}
          size="md"
          prefix={symbol}
          showUnit={false}
          aria-label={`${symbol}, ${unit}`}
          quantity={quantity}
          system={system}
          value={loads[key]}
          onChange={(value) => onChange({ [key]: value })}
        />
      ))}
    </div>
  )
}
