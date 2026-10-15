// A datum-shift row (engine notes §3): the shift of one datum reference
// frame whose datums are at MMB/LMB, as its own row of the chain. It reads
// as one line like any row:
//
//   #  DIR  CONTRIBUTOR             NOMINAL   TOLERANCE          = ±
//   4   ±   Datum shift A|B(M)      0         ⇆ A|B(M)          ±0.050  ⌄
//
// The band is centred (0 ± shift/2), so it has no direction. Its details
// say where it belongs (once per frame, where the chain crosses the datum
// feature's interface with its mating part or fixture), take the frame's
// datums and their sizes, and show ON THE STACK how the shift was reached
// (ASME Y14.5-2018 §7; ISO 2692:2021; Fischer 2011).
import { useId, useState, type ReactNode } from 'react'
import { Button, Icon, MonoLabel, cx } from '../../../../app/ui'
import type { ContributorResult } from '../../calc'
import { shiftText } from '../logic/datumShifts'
import { rowLabel } from '../logic/engineInput'
import { len, plusMinus, sigma } from '../logic/format'
import { datumShiftOf, modifierHeadline, shiftReadout } from '../logic/readouts'
import { faultField } from '../logic/steps'
import type { DatumCell, DatumShiftRow } from '../state/stackInputs'
import type { StackStepProps } from '../steps/stepProps'
import { DirectionButton } from './ContributorList'
import { DetailRow } from './DimensionDetails'
import styles from './editor.module.css'
import { DatumInput, SizePanel } from './GeometricFields'

/** Where a datum shift belongs (the engine's appliesWhen, shown before a result is in). */
const BELONGS =
  'Once per datum reference frame, where the chain crosses the interface between the datum feature and its mating part or fixture. '
  + 'Not between two features of the same part located in this frame: they shift together.'

interface DatumShiftRowViewProps extends Pick<StackStepProps, 'inputs' | 'dispatch' | 'system' | 'selection'> {
  row: DatumShiftRow
  index: number
  contributor: ContributorResult | null
  handle: ReactNode
  error: string | null
  /** What to check on the row, under its line. */
  notes: ReactNode
}

export function DatumShiftRowView(props: DatumShiftRowViewProps) {
  const { row, index, contributor, handle, error, notes, selection } = props
  const detailsId = useId()
  const expanded = selection.expanded.includes(row.id)
  const n = index + 1
  return (
    <>
      <div className={styles.line}>
        {handle}
        <DirectionButton sensitivity={row.sensitivity} index={index} neutral onFlip={() => undefined} />
        <input
          className={styles.labelInput}
          aria-label={`Row ${n} name`}
          placeholder={rowLabel({ ...row, label: '' }, index)}
          value={row.label}
          onChange={(event) => props.dispatch({ type: 'datumShift', id: row.id, changes: { label: event.target.value } })}
        />
        <span className={cx(styles.nominalCell, styles.readOnly, styles.shiftZero)} title="A datum shift is centred: nominal 0">
          0
        </span>
        <span className={styles.toleranceCell}>
          <button
            type="button"
            className={cx(styles.toleranceButton, error && styles.invalidBox)}
            aria-label={`Row ${n} ${shiftText(row)}: open the details`}
            onClick={() => selection.open(row.id)}
          >
            <span className={styles.shiftFrame}>
              <Icon name="datum-shift" size={14} />
              <span className={styles.shiftFrameText}>{shiftText(row).replace(/^datum shift /, '')}</span>
            </span>
          </button>
        </span>
        <span className={styles.halfBand}>{contributor && plusMinus(props.system, contributor.halfBand)}</span>
        <button
          type="button"
          className={styles.chevron}
          aria-expanded={expanded}
          aria-controls={detailsId}
          aria-label={`${expanded ? 'Hide' : 'Show'} the details of row ${n}`}
          onClick={(event) => {
            event.stopPropagation()
            selection.toggle(row.id)
          }}
        >
          <Icon name="chevron-down" />
        </button>
      </div>
      {error && <p className={styles.rowError}>{error}</p>}
      {notes}
      <div id={detailsId} hidden={!expanded} className={styles.details}>
        {expanded && <DatumShiftDetails {...props} />}
      </div>
    </>
  )
}

function DatumShiftDetails({ row, index, contributor, error, inputs, dispatch, system, selection }: DatumShiftRowViewProps) {
  const n = index + 1
  const invalid = error !== null && faultField(error) === 'datum'
  const change = (changes: Partial<Pick<DatumShiftRow, 'label' | 'datums' | 'frame' | 'source'>>) => dispatch({ type: 'datumShift', id: row.id, changes })
  const setDatum = (d: number, next: Partial<DatumCell>) => change({ datums: row.datums.map((cell, i) => (i === d ? { ...cell, ...next } : cell)) })
  return (
    <div className={styles.detailsBody}>
      <DetailRow label="">
        <p className={styles.guidance}>
          <strong>Datum shift</strong> {contributor?.conversion.appliesWhen ?? BELONGS}
        </p>
      </DetailRow>

      <DetailRow label="Datums">
        <div className={styles.datums}>
          {row.datums.map((datum, d) => (
            <DatumInput key={d} datum={datum} position={d} rowNumber={n} standard={inputs.standard} boundary invalid={invalid} onChange={(next) => setDatum(d, next)} />
          ))}
        </div>
        {row.datums.map(
          (datum, d) =>
            datum.letter.trim() &&
            datum.modifier !== 'rmb' && (
              <SizePanel
                key={d}
                title={`Datum ${datum.letter.trim()} feature size`}
                feature={datum.feature}
                system={system}
                label={`Row ${n} datum ${datum.letter.trim()} feature`}
                invalid={invalid}
                onChange={(feature) => setDatum(d, { feature })}
                readout={shiftReadout(system, datum)}
                allowance={{ value: datum.boundaryAllowance, onChange: (boundaryAllowance) => setDatum(d, { boundaryAllowance }) }}
              />
            ),
        )}
      </DetailRow>

      <DetailRow label="Frame name">
        <input
          className={styles.textInput}
          aria-label={`Row ${n} frame name`}
          placeholder="optional, e.g. Housing"
          value={row.frame}
          onChange={(event) => change({ frame: event.target.value })}
        />
        <span className={styles.muted}>Tells two frames with the same letters apart, such as the same A|B on two parts.</span>
      </DetailRow>

      <ShiftOnTheStack row={row} contributor={contributor} system={system} />

      <DetailRow label="Source">
        <input
          className={styles.textInput}
          aria-label={`Row ${n} source`}
          placeholder="e.g. drawing 1043-B, frame at C4"
          value={row.source}
          onChange={(event) => change({ source: event.target.value })}
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

/** ON THE STACK: ±shift/2, and the shift of each MMB/LMB datum that makes it up. */
function ShiftOnTheStack({ row, contributor, system }: Pick<DatumShiftRowViewProps, 'row' | 'contributor' | 'system'>) {
  const [open, setOpen] = useState(false)
  if (!contributor) return null
  const { conversion } = contributor
  const shift = contributor.geometric?.datumShift ?? 2 * contributor.halfBand
  const terms = row.datums.flatMap((datum) => {
    const each = datumShiftOf(datum)
    return datum.letter.trim() && each !== null && each > 0 ? [`datum ${datum.letter.trim()} shift ${len(system, each)}`] : []
  })
  return (
    <section className={styles.onTheStack} aria-label="On the stack">
      <div className={styles.onTheStackHead}>
        <MonoLabel size="xs">On the stack</MonoLabel>
        <span className={styles.bigBand}>{plusMinus(system, contributor.halfBand)}</span>
        <span className={styles.muted}>worst case · σ {sigma(system, contributor.sigma)} RSS</span>
      </div>
      <p className={styles.mono}>
        {terms.length > 1 && (
          <>
            {terms.join(' + ')}
            <br />
          </>
        )}
        {terms.length === 1 ? terms[0] : `shift ${len(system, shift)}`} → {plusMinus(system, shift / 2)}, centred
      </p>
      {conversion.unsure && <p className={styles.modifierLine}>{modifierHeadline(conversion.unsure)}</p>}
      <button type="button" className={styles.disclosure} aria-expanded={open} onClick={() => setOpen(!open)}>
        Sources and when to include it {open ? '‹' : '›'}
      </button>
      {open && (
        <div className={styles.includeWhen}>
          <p>{conversion.appliesWhen ?? BELONGS}</p>
          {conversion.unsure && (
            <p>
              <strong>Judgement call.</strong> {conversion.unsure}
            </p>
          )}
          <p>{conversion.rule}</p>
          <p className={styles.source}>{conversion.source}</p>
        </div>
      )}
    </section>
  )
}
