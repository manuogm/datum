// The required clearance window as an input row that can be empty. Empty, it
// reads "Not set" with a link to set one; set, it is a range input with a
// link to remove it (when the window is optional, as in the calculator).
import { Button, RangeInputRow, ValueRow } from '../../../../app/ui'
import type { UnitSystem } from '../../../../core/units'
import type { ClearanceRangeUm } from '../../advisor'
import styles from './shared.module.css'

const LABEL = 'Clearance in service'

interface ClearanceWindowRowProps {
  window: ClearanceRangeUm | null
  system: UnitSystem
  /** What the window starts from when the engineer sets one. */
  start: ClearanceRangeUm
  /** The window can be removed again (calculator); the advisor needs one. */
  optional: boolean
  onChange: (window: ClearanceRangeUm | null) => void
}

export function ClearanceWindowRow({ window, system, start, optional, onChange }: ClearanceWindowRowProps) {
  if (window === null) {
    return (
      <ValueRow
        label={LABEL}
        value={
          <span className={styles.unset}>
            Not set
            <Button variant="link" size="sm" onClick={() => onChange(start)}>
              Set a window
            </Button>
          </span>
        }
      />
    )
  }
  return (
    <div className={styles.window}>
      <RangeInputRow
        label={LABEL}
        quantity="deviation"
        system={system}
        min={window.minUm}
        max={window.maxUm}
        onChange={(minUm, maxUm) => onChange({ minUm, maxUm })}
      />
      {optional && (
        <Button variant="link" size="sm" onClick={() => onChange(null)}>
          Remove window
        </Button>
      )}
    </div>
  )
}
