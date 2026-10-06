// The load case on screen: its name and the force and moment at the load
// point, plus the service temperature of every joint. Where the load point
// is waits under More options: most load cases act at the origin.
import { Button, Field, InputWell, MonoLabel, MoreOptions, NumberInput, PanelSection, RangeInputRow } from '../../../../app/ui'
import { unitOf, type Quantity, type UnitSystem } from '../../../../core/units'
import type { TemperatureRangeC } from '../../calc'
import type { Vector3 } from '../../pattern'
import type { LoadCaseSpec } from '../state/boltInputs'
import styles from './pattern.module.css'

interface LoadCaseFieldsProps {
  loadCase: LoadCaseSpec
  canRemove: boolean
  serviceTempC: TemperatureRangeC
  system: UnitSystem
  onChange: (changes: Partial<Omit<LoadCaseSpec, 'id'>>) => void
  onAdd: () => void
  onRemove: () => void
  onTemperatureChange: (serviceTempC: TemperatureRangeC) => void
}

export function LoadCaseFields({ loadCase, canRemove, serviceTempC, system, onChange, onAdd, onRemove, onTemperatureChange }: LoadCaseFieldsProps) {
  const pointMoved = AXES.filter((axis) => loadCase.loadPointMm[axis] !== 0).length
  return (
    <>
      <PanelSection label={`Load case ${loadCase.id} · at the load point`}>
        <Field size="md" aria-label="Load case name" value={loadCase.name} onChange={(event) => onChange({ name: event.target.value })} />
        <div className={styles.vector}>
          <AxisHeadings />
          <VectorFields symbol="F" quantity="force" vector={loadCase.forceN} system={system} onChange={(forceN) => onChange({ forceN })} />
          <VectorFields symbol="M" quantity="torque" vector={loadCase.momentNm} system={system} onChange={(momentNm) => onChange({ momentNm })} />
        </div>
        <span className={styles.typeDetail}>
          Rigid plate: the axial load is shared by bolt position, the in-plane shear by each bolt&apos;s friction grip. F and M are in the
          bolts&apos; axes, z along the bolts.
        </span>
        <RangeInputRow
          label="Service temp."
          quantity="temperature"
          system={system}
          min={serviceTempC.minC}
          max={serviceTempC.maxC}
          onChange={(minC, maxC) => onTemperatureChange({ minC, maxC })}
        />
        <div className={styles.actions}>
          <Button size="sm" onClick={onAdd}>
            Copy load case
          </Button>
          <Button size="sm" variant="ghost" onClick={onRemove} disabled={!canRemove}>
            Remove {loadCase.id}
          </Button>
        </div>
      </PanelSection>
      <MoreOptions count={AXES.length} changed={pointMoved}>
        <PanelSection label="Load point">
          <div className={styles.vector}>
            <AxisHeadings />
            <VectorFields symbol="r" quantity="length" vector={loadCase.loadPointMm} system={system} onChange={(loadPointMm) => onChange({ loadPointMm })} />
          </div>
          <span className={styles.typeDetail}>Where F and M act, from the origin of the bolt positions; z is its height above the interface.</span>
        </PanelSection>
      </MoreOptions>
    </>
  )
}

const AXES = ['x', 'y', 'z'] as const

interface VectorFieldsProps {
  /** Row caption and the start of each field's name: 'F' gives Fx, Fy, Fz. */
  symbol: string
  quantity: Quantity
  vector: Vector3
  system: UnitSystem
  onChange: (vector: Vector3) => void
}

/** The x, y, z heading row of the grid. */
function AxisHeadings() {
  return (
    <>
      <span />
      {AXES.map((axis) => (
        <MonoLabel key={axis}>{axis}</MonoLabel>
      ))}
      <span />
    </>
  )
}

/** One row of the force / moment / load point grid, with its unit at the end. */
function VectorFields({ symbol, quantity, vector, system, onChange }: VectorFieldsProps) {
  return (
    <>
      <span className={styles.vectorSymbol}>{symbol}</span>
      {AXES.map((axis) => (
        <InputWell key={axis}>
          <NumberInput label={`${symbol}${axis}`} quantity={quantity} system={system} value={vector[axis]} onChange={(value) => onChange({ ...vector, [axis]: value })} />
        </InputWell>
      ))}
      <span className={styles.vectorUnit}>{unitOf(quantity, system)}</span>
    </>
  )
}
