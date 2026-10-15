// A dimension row's details, under the row (design §3.2): the tolerance type
// and its fields, then the row switches (⟨ST⟩, count half of it), where the
// dimension comes from, and Duplicate / Remove. Remove sits here, behind the
// expand, so it is never one stray click away.
import type { ReactNode } from 'react'
import { Button, MonoLabel, SegmentedControl, Switch, cx } from '../../../../app/ui'
import type { ContributorResult } from '../../calc'
import { GdtModifier } from '../gdt/GdtModifier'
import { meanReadout } from '../logic/readouts'
import type { RowField } from '../logic/steps'
import type { DimensionRow, StackInputs, ToleranceKind } from '../state/stackInputs'
import type { StackStepProps } from '../steps/stepProps'
import styles from './editor.module.css'
import { GeometricFields } from './GeometricFields'
import { LengthInput } from './LengthInput'

const TOLERANCE_KINDS: readonly { value: ToleranceKind; label: string }[] = [
  { value: 'symmetric', label: '±' },
  { value: 'deviations', label: '+a / −b' },
  { value: 'limits', label: 'Limits' },
  { value: 'geometric', label: 'Geometric' },
]

export interface DimensionDetailsProps extends Pick<StackStepProps, 'dispatch' | 'system' | 'selection'> {
  inputs: StackInputs
  row: DimensionRow
  index: number
  contributor: ContributorResult | null
  invalidField: RowField | null
  error: string | null
  onTouch: () => void
}

export function DimensionDetails(props: DimensionDetailsProps) {
  const { row, index, dispatch, system, contributor, invalidField, selection } = props
  const { tolerance } = row
  const n = index + 1
  const setNominal = (nominal: number | null) => dispatch({ type: 'row', id: row.id, changes: { nominal } })
  const nominalField = (
    <LengthInput label="Nominal" aria-label={`Row ${n} nominal`} value={row.nominal} system={system} showUnit invalid={invalidField === 'nominal'} onChange={setNominal} />
  )
  const toleranceInvalid = invalidField === 'tolerance'
  return (
    <div className={styles.detailsBody}>
      <DetailRow label="Tolerance">
        <SegmentedControl
          label={`Row ${n} tolerance type`}
          size="sm"
          options={TOLERANCE_KINDS}
          value={tolerance.kind}
          onChange={(kind) => dispatch({ type: 'toleranceKind', id: row.id, kind })}
        />
      </DetailRow>

      {tolerance.kind === 'symmetric' && (
        <DetailRow label="">
          <div className={styles.fieldPair}>
            {nominalField}
            <LengthInput
              label="± t"
              aria-label={`Row ${n} ± tolerance`}
              value={tolerance.plusMinus}
              system={system}
              showUnit
              invalid={toleranceInvalid}
              onChange={(plusMinus) => dispatch({ type: 'tolerance', id: row.id, tolerance: { kind: 'symmetric', plusMinus } })}
            />
          </div>
        </DetailRow>
      )}

      {tolerance.kind === 'deviations' && (
        <DetailRow label="">
          <div className={styles.fieldTriple}>
            {nominalField}
            <LengthInput
              label="Upper deviation"
              aria-label={`Row ${n} upper deviation`}
              value={tolerance.upper}
              system={system}
              signed
              showUnit
              invalid={toleranceInvalid}
              onChange={(upper) => dispatch({ type: 'tolerance', id: row.id, tolerance: { ...tolerance, upper } })}
            />
            <LengthInput
              label="Lower deviation"
              aria-label={`Row ${n} lower deviation`}
              value={tolerance.lower}
              system={system}
              signed
              showUnit
              invalid={toleranceInvalid}
              onChange={(lower) => dispatch({ type: 'tolerance', id: row.id, tolerance: { ...tolerance, lower } })}
            />
          </div>
          {contributor && <span className={styles.readout}>{meanReadout(system, contributor)}</span>}
        </DetailRow>
      )}

      {tolerance.kind === 'limits' && (
        <DetailRow label="">
          <div className={styles.fieldTriple}>
            <LengthInput
              label="Smallest"
              aria-label={`Row ${n} smallest size`}
              value={tolerance.min}
              system={system}
              showUnit
              invalid={toleranceInvalid}
              onChange={(min) => dispatch({ type: 'tolerance', id: row.id, tolerance: { ...tolerance, min } })}
            />
            <LengthInput
              label="Largest"
              aria-label={`Row ${n} largest size`}
              value={tolerance.max}
              system={system}
              showUnit
              invalid={toleranceInvalid}
              onChange={(max) => dispatch({ type: 'tolerance', id: row.id, tolerance: { ...tolerance, max } })}
            />
            {nominalField}
          </div>
          {contributor && <span className={styles.readout}>{meanReadout(system, contributor)}</span>}
        </DetailRow>
      )}

      {tolerance.kind === 'geometric' && <GeometricFields {...props} entry={tolerance} />}

      <DetailRow label="Row">
        <div className={styles.switches}>
          <Switch checked={row.statistical} onChange={(statistical) => dispatch({ type: 'row', id: row.id, changes: { statistical } })}>
            <span className={styles.switchText}>
              Statistical tolerance <GdtModifier symbol="ST" />
            </span>
          </Switch>
          <Switch checked={Math.abs(row.sensitivity) === 0.5} onChange={(on) => dispatch({ type: 'half', id: row.id, on })}>
            <span className={styles.switchText}>Count half of it ×½ (radius, half width)</span>
          </Switch>
        </div>
      </DetailRow>

      <DetailRow label="Source">
        <input
          className={styles.textInput}
          aria-label={`Row ${n} source`}
          placeholder="e.g. drawing 1043-B, zone C4"
          value={row.source}
          onChange={(event) => dispatch({ type: 'row', id: row.id, changes: { source: event.target.value } })}
        />
      </DetailRow>

      <div className={styles.rowActions}>
        <Button variant="link" size="sm" onClick={() => dispatch({ type: 'duplicate', id: row.id })}>
          Duplicate
        </Button>
        <Button
          variant="link"
          size="sm"
          className={styles.removeButton}
          onClick={() => {
            selection.select(null)
            dispatch({ type: 'remove', id: row.id })
          }}
        >
          Remove
        </Button>
      </div>
    </div>
  )
}

/** One labelled line of the details: a mono caps label on the left, the inputs on the right. */
export function DetailRow({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx(styles.detailRow, className)}>
      <MonoLabel size="xs" className={styles.detailLabel}>
        {label}
      </MonoLabel>
      <div className={styles.detailContent}>{children}</div>
    </div>
  )
}
