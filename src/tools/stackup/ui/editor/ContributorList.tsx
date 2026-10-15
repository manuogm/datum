// The contributor editor (design §3): the chain as one list, one row per
// contributor in loop order. A row stays one line:
//
//   #  DIR  CONTRIBUTOR             NOMINAL   TOLERANCE      = ±
//   2  −←   Groove centre from A    22.000    ⌖ │ 0.100     ±0.050  ⌄
//
// and everything else is in the row's details, opened with the chevron. A
// row is dragged by its number (or moved with the arrow keys on it), as the
// plies of a laminate are. An assembly's linked part stacks are rows too,
// read from the library (LinkedRowView). Under the list: the add buttons and
// the sum row, the result as it stands while typing.
import { useEffect, useId, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { Button, Icon, cx } from '../../../../app/ui'
import { fromDisplay, parseDecimal, type UnitSystem } from '../../../../core/units'
import type { ContributorResult } from '../../calc'
import { FeatureControlFrame } from '../gdt/FeatureControlFrame'
import { GdtModifier } from '../gdt/GdtModifier'
import type { LinkValues } from '../logic/engineInput'
import { coefficientText, len, plusMinus, range, toleranceText } from '../logic/format'
import { breakdownTerms, rowResult, widened } from '../logic/readouts'
import { faultField, type RowField } from '../logic/steps'
import { upperName } from '../logic/verdict'
import { nextRowId } from '../state/stackReducer'
import type { DimensionRow } from '../state/stackInputs'
import type { StackStepProps } from '../steps/stepProps'
import { DimensionDetails } from './DimensionDetails'
import styles from './editor.module.css'
import { LinkedRowView } from './LinkedRowView'

export interface ChainActions {
  /** Open the link picker to add a part stack (Assembly). */
  onLinkPart: () => void
  /** Open the link picker to replace this row's link. */
  onRelink: (rowId: string) => void
  /** Turn a linked row into a dimension (asks first). */
  onMakeDimension: (rowId: string) => void
}

type ContributorListProps = Pick<StackStepProps, 'inputs' | 'dispatch' | 'results' | 'system' | 'fault' | 'status' | 'selection' | 'fresh'> & ChainActions

export function ContributorList(props: ContributorListProps) {
  const { inputs, dispatch, results, system, fault, selection, fresh } = props
  const listId = useId()
  // A row just added, to focus once it is drawn: its label, or a geometric row's characteristic picker.
  const focusRow = useRef<{ id: string; picker: boolean } | null>(null)
  const [dragged, setDragged] = useState<number | null>(null)
  const [target, setTarget] = useState<number | null>(null)
  const analysis = results.analysis.ok ? results.analysis.value : null
  const linkValues = new Map<string, LinkValues>([...results.links].map(([id, link]) => [id, { label: link.partName, stack: link.stack }]))

  useEffect(() => {
    const wanted = focusRow.current
    if (!wanted) return
    focusRow.current = null
    const selector = wanted.picker ? `[data-row="${wanted.id}"] [role="radio"][aria-checked="true"]` : `[data-row="${wanted.id}"] input`
    document.querySelector<HTMLElement>(`#${CSS.escape(listId)} ${selector}`)?.focus()
  })

  const add = (geometric: boolean) => {
    const id = nextRowId(inputs.rows)
    dispatch({ type: 'addDimension', geometric })
    fresh.add(id)
    if (geometric) selection.open(id)
    else selection.select(id)
    focusRow.current = { id, picker: geometric }
  }
  const endDrag = () => {
    setDragged(null)
    setTarget(null)
  }
  const move = (from: number, to: number) => dispatch({ type: 'move', from, to })
  const contributorOf = (i: number): ContributorResult | null => analysis?.contributors[i] ?? rowResult(inputs, linkValues, i)
  const assembly = inputs.mode === 'assembly'

  return (
    <div className={styles.editor} id={listId}>
      {inputs.rows.length > 0 && (
        <div className={styles.head} aria-hidden="true">
          <span>#</span>
          <span>DIR</span>
          <span>{assembly ? 'PART OR DIMENSION' : 'CONTRIBUTOR'}</span>
          <span>NOMINAL</span>
          <span>TOLERANCE</span>
          <span className={styles.right}>= ±</span>
          <span />
        </div>
      )}
      <ol className={styles.rows} aria-label="Chain, in loop order">
        {inputs.rows.map((row, i) => {
          const rowFault = fault?.row === i ? fault.error : null
          const handle: HandleProps = {
            index: i,
            count: inputs.rows.length,
            onDragStart: () => setDragged(i),
            onDragEnd: endDrag,
            onMove: (to) => {
              move(i, to)
              selection.select(row.id)
            },
          }
          return (
            <li
              key={row.id}
              data-row={row.id}
              className={cx(
                styles.row,
                row.id === selection.selected && styles.selected,
                rowFault && styles.rowInvalid,
                row.kind === 'linked' && styles[`link-${results.links.get(row.id)?.state ?? 'linked'}`],
                dragged === i && styles.dragged,
                target === i && dragged !== null && dragged !== i && (dragged < i ? styles.dropBelow : styles.dropAbove),
              )}
              onFocus={() => selection.select(row.id)}
              onClick={() => selection.select(row.id)}
              onDragOver={(event: DragEvent) => {
                if (dragged === null) return
                event.preventDefault()
                setTarget(i)
              }}
              onDrop={(event: DragEvent) => {
                event.preventDefault()
                if (dragged !== null) move(dragged, i)
                endDrag()
              }}
            >
              {row.kind === 'linked' ? (
                <LinkedRowView
                  row={row}
                  link={results.links.get(row.id)}
                  index={i}
                  system={system}
                  handle={<RowHandle {...handle} />}
                  expanded={selection.expanded.includes(row.id)}
                  onToggle={() => selection.toggle(row.id)}
                  onFlip={() => dispatch({ type: 'flip', id: row.id })}
                  onRelink={() => props.onRelink(row.id)}
                  onMakeDimension={() => props.onMakeDimension(row.id)}
                  onRemove={() => dispatch({ type: 'remove', id: row.id })}
                  error={rowFault}
                />
              ) : (
                <DimensionRowView
                  {...props}
                  row={row}
                  index={i}
                  contributor={contributorOf(i)}
                  handle={<RowHandle {...handle} />}
                  error={rowFault}
                  onTouch={() => fresh.touch(row.id)}
                />
              )}
            </li>
          )
        })}
      </ol>
      <AddButtons assembly={assembly} onAdd={add} onLink={props.onLinkPart} />
      {inputs.rows.length > 0 && <SumRow {...props} />}
    </div>
  )
}

/** "+ Link part stack" (Assembly), "+ Add dimension", "+ Add geometric tolerance". */
export function AddButtons({ assembly, onAdd, onLink }: { assembly: boolean; onAdd: (geometric: boolean) => void; onLink: () => void }) {
  return (
    <div className={styles.addButtons}>
      {assembly && (
        <Button variant="link" size="sm" onClick={onLink}>
          + Link part stack
        </Button>
      )}
      <Button variant="link" size="sm" onClick={() => onAdd(false)}>
        + Add dimension
      </Button>
      <Button variant="link" size="sm" onClick={() => onAdd(true)}>
        + Add geometric tolerance
      </Button>
    </div>
  )
}

interface HandleProps {
  index: number
  count: number
  onDragStart: () => void
  onDragEnd: () => void
  onMove: (to: number) => void
}

/** The row number, which is also the drag handle (⠿ on hover or focus); the arrow keys move the row. */
function RowHandle({ index, count, onDragStart, onDragEnd, onMove }: HandleProps) {
  return (
    <button
      type="button"
      className={styles.handle}
      draggable
      aria-label={`Move row ${index + 1}: drag, or use the arrow keys`}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onKeyDown={(event) => {
        const to = event.key === 'ArrowUp' ? index - 1 : event.key === 'ArrowDown' ? index + 1 : null
        if (to === null || to < 0 || to >= count) return
        event.preventDefault()
        onMove(to)
      }}
    >
      <span className={styles.handleNumber}>{index + 1}</span>
      <span className={styles.handleGrip} aria-hidden="true">
        ⠿
      </span>
    </button>
  )
}

/** The direction cell: +→ adds, −← subtracts, ½ when only half of it counts. */
export function DirectionButton({ sensitivity, index, onFlip, neutral = false, invalid = false }: { sensitivity: number; index: number; onFlip: () => void; neutral?: boolean; invalid?: boolean }) {
  if (neutral) {
    return (
      <span className={cx(styles.direction, styles.directionNeutral)} title="No direction: a zone centred on the surface adds ± either way.">
        ±
      </span>
    )
  }
  const adds = sensitivity > 0
  return (
    <button
      type="button"
      className={cx(styles.direction, invalid && styles.invalidBox)}
      aria-label={`Row ${index + 1} direction: ${adds ? 'adds (+)' : 'subtracts (−)'}. Press to make it ${adds ? 'subtract' : 'add'}.`}
      onClick={onFlip}
    >
      {coefficientText(sensitivity)}
      <span aria-hidden="true">{adds ? '→' : '←'}</span>
    </button>
  )
}

interface DimensionRowViewProps extends ContributorListProps {
  row: DimensionRow
  index: number
  contributor: ContributorResult | null
  handle: ReactNode
  error: string | null
  onTouch: () => void
}

function DimensionRowView(props: DimensionRowViewProps) {
  const { row, index, contributor, handle, error, inputs, dispatch, system, selection, onTouch } = props
  const detailsId = useId()
  const expanded = selection.expanded.includes(row.id)
  const field: RowField | null = error ? faultField(error) : null
  const { tolerance } = row
  const geometric = tolerance.kind === 'geometric' ? tolerance : null
  // A zone centred on a surface (form or orientation, nominal 0): direction changes nothing.
  const neutral = geometric !== null && row.nominal === 0 && contributor !== null && Math.abs(contributor.meanShift) < 1e-12
  const breakdown = contributor?.geometric ?? null
  const plain = tolerance.kind === 'symmetric'
  return (
    <>
      <div className={styles.line} onBlur={(event) => event.target instanceof HTMLInputElement && event.target.inputMode === 'decimal' && onTouch()}>
        {handle}
        <DirectionButton sensitivity={row.sensitivity} index={index} neutral={neutral} invalid={field === 'direction'} onFlip={() => dispatch({ type: 'flip', id: row.id })} />
        <input
          className={styles.labelInput}
          aria-label={`Row ${index + 1} name`}
          placeholder={`Dimension ${index + 1}`}
          value={row.label}
          onChange={(event) => dispatch({ type: 'row', id: row.id, changes: { label: event.target.value } })}
        />
        <span className={cx(styles.nominalCell, geometric && styles.basic, row.nominal === 0 && styles.zero)}>
          <NominalInput row={row} index={index} system={system} invalid={field === 'nominal'} onChange={(nominal) => dispatch({ type: 'row', id: row.id, changes: { nominal } })} />
        </span>
        <span className={styles.toleranceCell}>
          {plain ? (
            <PlusMinusInput
              value={tolerance.plusMinus}
              system={system}
              label={`Row ${index + 1} ± tolerance`}
              invalid={field === 'tolerance'}
              onChange={(plusMinus) => dispatch({ type: 'tolerance', id: row.id, tolerance: { kind: 'symmetric', plusMinus } })}
            />
          ) : (
            <button
              type="button"
              className={cx(styles.toleranceButton, error && field !== 'nominal' && field !== 'direction' && styles.invalidBox)}
              aria-label={`Row ${index + 1} tolerance ${toleranceText(system, tolerance, row.statistical)}: open the details`}
              onClick={() => selection.open(row.id)}
            >
              {geometric ? (
                <FeatureControlFrame entry={geometric} system={system} standard={inputs.standard} compact />
              ) : (
                <span>{toleranceText(system, tolerance)}</span>
              )}
            </button>
          )}
        </span>
        <span className={styles.halfBand}>
          {row.statistical && <GdtModifier symbol="ST" />}
          {contributor && (!plain || row.statistical) && (
            <span
              className={cx(widened(breakdown) && styles.widened)}
              title={geometric && breakdown && widened(breakdown) ? breakdownTerms(system, geometric, breakdown) : undefined}
            >
              {plusMinus(system, contributor.halfBand)}
            </span>
          )}
        </span>
        <button
          type="button"
          className={styles.chevron}
          aria-expanded={expanded}
          aria-controls={detailsId}
          aria-label={`${expanded ? 'Hide' : 'Show'} the details of row ${index + 1}`}
          onClick={(event) => {
            event.stopPropagation()
            selection.toggle(row.id)
          }}
        >
          <Icon name="chevron-down" />
        </button>
      </div>
      {error && <p className={styles.rowError}>{error}</p>}
      <div id={detailsId} hidden={!expanded} className={styles.details}>
        {expanded && <DimensionDetails {...props} invalidField={field} onTouch={onTouch} />}
      </div>
    </>
  )
}

/** The nominal (a magnitude; its direction is the DIR cell). For a geometric row the basic dimension, framed. */
function NominalInput({ row, index, system, invalid, onChange }: { row: DimensionRow; index: number; system: UnitSystem; invalid: boolean; onChange: (value: number | null) => void }) {
  return <BareLength label={`Row ${index + 1} nominal`} value={row.nominal} system={system} invalid={invalid} onChange={onChange} placeholder="—" />
}

/** The common case typed inline: ± t. */
function PlusMinusInput({ value, system, label, invalid, onChange }: { value: number | null; system: UnitSystem; label: string; invalid: boolean; onChange: (value: number | null) => void }) {
  return (
    <span className={cx(styles.pmWell, invalid && styles.invalidBox)}>
      <span className={styles.pmSign} aria-hidden="true">
        ±
      </span>
      <BareLength label={label} value={value} system={system} invalid={false} onChange={onChange} placeholder="—" bare />
    </span>
  )
}

/** A compact length input for the row line (the row grid sets its width). */
export function BareLength({
  label, value, system, invalid, onChange, placeholder, bare = false, signed = false,
}: { label: string; value: number | null; system: UnitSystem; invalid: boolean; onChange: (value: number | null) => void; placeholder?: string; bare?: boolean; signed?: boolean }) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = value === null ? '' : len(system, value)
  return (
    <input
      className={cx(styles.cellInput, bare && styles.bareInput, invalid && styles.invalidBox)}
      aria-label={label}
      aria-invalid={invalid || undefined}
      inputMode="decimal"
      autoComplete="off"
      placeholder={placeholder}
      value={draft ?? (signed && value !== null && value > 0 ? `+${shown}` : shown)}
      onChange={(event) => {
        const text = event.target.value
        setDraft(text)
        // Empty: not entered (null). Otherwise each complete number as it is typed ("−", "12." wait for more).
        if (text.trim() === '') onChange(null)
        else {
          const typed = parseDecimal(text)
          if (typed !== null) onChange(fromDisplay('length', system, typed))
        }
      }}
      onBlur={() => setDraft(null)}
    />
  )
}


/** "= Shoulder to circlip groove   20.925   WC 20.825 … 21.095", in the verdict method's status colour. */
function SumRow({ inputs, results, system, status }: ContributorListProps) {
  const analysis = results.analysis.ok ? results.analysis.value : null
  const chosen = analysis ? (analysis.method === 'worst-case' ? analysis.worstCase : analysis.rss) : null
  const tone = status === 'pass' ? styles.okText : status === 'review' ? styles.warnText : status === 'fail' ? styles.badText : undefined
  return (
    <div className={styles.sum}>
      <span className={styles.sumEquals}>=</span>
      <span className={styles.sumName}>{upperName(inputs.resultName)}</span>
      <span className={styles.sumNominal}>{analysis ? len(system, analysis.nominal) : '—'}</span>
      <span className={cx(styles.sumRange, tone)}>
        {analysis && chosen ? `${analysis.method === 'worst-case' ? 'WC' : 'RSS'} ${range(system, chosen.min, chosen.max)}` : '—'}
      </span>
    </div>
  )
}

