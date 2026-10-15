// Step 2 · Contributors (Part) / Parts (Assembly): the chain, in loop order,
// in the contributor editor, with the stack chart beside it following every
// edit. Next waits for a chain the engine accepts: every later step needs a
// result. A broken link does not block it (the engine takes the part's last
// known values) but is noted above the list.
import { useState } from 'react'
import { Button, Callout, Dialog, EmptyState, StepPage } from '../../../../app/ui'
import { StackChart } from '../charts/StackChart'
import { stackChartModel } from '../charts/stackChart'
import { AddButtons, ContributorList } from '../editor/ContributorList'
import { LinkPicker } from '../editor/LinkPicker'
import { lengthUnit } from '../logic/format'
import { brokenLinksNote } from '../logic/links'
import { chainCount, stepLabel } from '../logic/steps'
import { nextRowId } from '../state/stackReducer'
import type { StackStepProps } from './stepProps'
import styles from './steps.module.css'

const HINT = {
  part: 'The dimensions and geometric tolerances the loop passes through, in order. Expand a row for other tolerance types and modifiers.',
  assembly: 'The parts the loop crosses, in order: a linked part stack, or a dimension entered here. Expand a row for its details.',
}

/** What the step asks to confirm first. */
type Confirm = { kind: 'reset' } | { kind: 'toDimension'; rowId: string }

export function ChainStep(props: StackStepProps) {
  const { calculation, inputs, dispatch, results, library, system, flow, engineFault, fault, status, lastValid, selection, fresh } = props
  const [picker, setPicker] = useState<{ relink: string | null } | null>(null)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const chainFault = engineFault?.step === 'chain' ? engineFault : null
  const assembly = inputs.mode === 'assembly'
  const broken = brokenLinksNote(results.brokenLinks)
  const unit = lengthUnit(system)
  const model = lastValid && inputs.rows.length > 0 ? stackChartModel(lastValid, system, status ?? 'none') : null
  // A row the engine rejects keeps the last valid chart, dimmed, until it is fixed.
  const staleNote = chainFault && inputs.rows.length > 0 && fault ? (fault.row !== null ? `Fix row ${fault.row + 1} to update the chart` : 'Fix the chain to update the chart') : null
  const addFirst = (geometric: boolean) => {
    const id = nextRowId(inputs.rows)
    dispatch({ type: 'addDimension', geometric })
    fresh.add(id)
    if (geometric) selection.open(id)
    else selection.select(id)
  }
  return (
    <StepPage
      {...flow.page}
      title={stepLabel('chain', inputs.mode)}
      hint={HINT[inputs.mode]}
      nextDisabled={chainFault !== null}
      nextNote={chainFault?.error}
      actions={
        inputs.rows.length > 0 && (
          <Button variant="link" size="sm" onClick={() => setConfirm({ kind: 'reset' })}>
            Reset
          </Button>
        )
      }
      aside={
        <div className={styles.chartAside}>
          <StackChart
            model={model}
            resultName={inputs.resultName}
            unit={unit}
            start={inputs.startLabel}
            end={inputs.endLabel}
            selectedRow={selection.selected}
            onSelectRow={(id) => {
              selection.select(id)
              document.querySelector(`[data-row="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
            }}
            staleNote={staleNote}
          />
        </div>
      }
      asideLabel="Stack"
      asideMeta={`${chainCount(inputs)} · ${unit}`}
    >
      {broken && (
        <div className={styles.chainNote}>
          <Callout status="warn" title={broken} />
        </div>
      )}
      {inputs.rows.length === 0 ? (
        <div className={styles.empty}>
          <EmptyState inset="none">
            <strong className={styles.emptyTitle}>No contributors yet</strong>
            Start at the start feature and add each dimension the loop passes through, in order.
          </EmptyState>
          <AddButtons assembly={assembly} onAdd={addFirst} onLink={() => setPicker({ relink: null })} />
        </div>
      ) : (
        <ContributorList
          {...props}
          onLinkPart={() => setPicker({ relink: null })}
          onRelink={(rowId) => setPicker({ relink: rowId })}
          onMakeDimension={(rowId) => setConfirm({ kind: 'toDimension', rowId })}
        />
      )}

      {picker && (
        <LinkPicker
          library={library}
          system={system}
          assemblyId={calculation.id}
          linkedIds={new Set(inputs.rows.flatMap((row) => (row.kind === 'linked' ? [row.calcId] : [])))}
          title={picker.relink ? 'Relink a part stack' : undefined}
          onClose={() => setPicker(null)}
          onPick={(calcId, last) => {
            if (picker.relink) dispatch({ type: 'relink', id: picker.relink, calcId, last })
            else {
              selection.select(nextRowId(inputs.rows))
              dispatch({ type: 'addLink', calcId, last })
            }
            setPicker(null)
          }}
        />
      )}
      {confirm && (
        <ConfirmDialog
          confirm={confirm}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm.kind === 'reset') {
              dispatch({ type: 'clearRows' })
              selection.select(null)
            } else dispatch({ type: 'toDimension', id: confirm.rowId })
            setConfirm(null)
          }}
        />
      )}
    </StepPage>
  )
}

function ConfirmDialog({ confirm, onCancel, onConfirm }: { confirm: Confirm; onCancel: () => void; onConfirm: () => void }) {
  const reset = confirm.kind === 'reset'
  return (
    <Dialog
      title={reset ? 'Clear the chain?' : 'Make it a dimension?'}
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onCancel} data-autofocus>
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={onConfirm}>
            {reset ? 'Clear' : 'Make it a dimension'}
          </Button>
        </>
      }
    >
      <p className={styles.dialogText}>
        {reset
          ? 'Every row of the chain is removed. The requirement, the method and the names stay.'
          : 'The row takes the part’s current nominal and worst-case deviations and stops following the part. Its σ is lost: the row then counts as ±t = ±3σ.'}
      </p>
    </Dialog>
  )
}
