// The running loads per unit width: in-plane forces N on the left, moments M
// on the right, in the CLT sign convention (a positive Mx stretches the top).
import { PanelSection, QuantityField } from '../../../../app/ui'
import type { UnitSystem } from '../../../../core/units'
import { LOAD_COMPONENTS } from '../logic/loads'
import type { LoadSpec } from '../state/lamInputs'
import styles from './editor.module.css'

interface LoadsFieldsProps {
  loads: LoadSpec
  system: UnitSystem
  onChange: (changes: Partial<LoadSpec>) => void
}

/** Nx beside Mx, Ny beside My, Nxy beside Mxy. */
const BY_ROW = [0, 3, 1, 4, 2, 5].map((i) => LOAD_COMPONENTS[i])

export function LoadsFields({ loads, system, onChange }: LoadsFieldsProps) {
  return (
    <PanelSection label="Running loads · per unit width">
      <div className={styles.loads}>
        {BY_ROW.map(({ key, symbol, quantity }) => (
          <QuantityField
            key={key}
            size="md"
            prefix={symbol}
            aria-label={symbol}
            quantity={quantity}
            system={system}
            value={loads[key]}
            onChange={(value) => onChange({ [key]: value })}
          />
        ))}
      </div>
      <span className={styles.note}>A positive Mx stretches the top ply; z is measured up from the mid-plane.</span>
    </PanelSection>
  )
}
