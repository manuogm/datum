// The link picker (design §6.2): choose a saved Part stack, from any folder,
// to link into this assembly. Only Part stacks are listed, so an assembly
// can never link itself or another assembly (no circular links). The values
// shown come from running the engine on each part's saved inputs; a part
// whose chain fails cannot be picked. A part already linked here stays
// pickable: two identical spacers are a real case.
import { useState } from 'react'
import { Button, Dialog, Icon, Marker, SearchField, cx } from '../../../../app/ui'
import { subfolders, type Library } from '../../../../core/library'
import type { UnitSystem } from '../../../../core/units'
import { partResultText, partStacks, snapshotOfPart, statusOf, type PartStack } from '../logic/links'
import type { LinkSnapshot } from '../state/stackInputs'
import styles from './editor.module.css'

interface LinkPickerProps {
  library: Library
  system: UnitSystem
  /** The assembly being edited: never offered (it may still be stored as a Part). */
  assemblyId: string
  /** Part calculations already linked in this assembly. */
  linkedIds: ReadonlySet<string>
  title?: string
  onPick: (calcId: string, last: LinkSnapshot) => void
  onClose: () => void
}

const STATUS_WORD = { pass: 'Pass', review: 'Review', fail: 'Fail', none: 'No requirement' } as const
const STATUS_TONE = { pass: 'ok', review: 'warn', fail: 'bad', none: 'faint' } as const

/** Folder ids in the Move dialog's tree order, the top level (null) first. */
function folderOrder(library: Library, parentId: string | null = null): (string | null)[] {
  return subfolders(library, parentId).flatMap((folder) => [folder.id, ...folderOrder(library, folder.id)])
}

export function LinkPicker({ library, system, assemblyId, linkedIds, title = 'Link a part stack', onPick, onClose }: LinkPickerProps) {
  const [query, setQuery] = useState('')
  const [chosen, setChosen] = useState<string | null>(null)
  const parts = partStacks(library).filter((part) => part.calculation.id !== assemblyId)
  const words = query.trim().toLowerCase()
  const matches = (part: PartStack) =>
    !words || [part.calculation.name, part.inputs.partName, part.inputs.resultName, part.folderName].some((text) => text.toLowerCase().includes(words))
  const shown = parts.filter(matches)
  const groups = [null, ...folderOrder(library)]
    .map((folderId) => ({ folderId, parts: shown.filter((part) => part.calculation.folderId === folderId) }))
    .filter((group) => group.parts.length > 0)
  const pick = () => {
    const part = parts.find((p) => p.calculation.id === chosen)
    const last = part && snapshotOfPart(part)
    if (part && last) onPick(part.calculation.id, last)
  }
  return (
    <Dialog
      title={title}
      subtitle="Choose a saved Part calculation"
      onClose={onClose}
      footerNote="Only Part stacks, from every folder. It is added as +: flip it in the list."
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={pick} disabled={chosen === null}>
            Link part
          </Button>
        </>
      }
    >
      {parts.length === 0 ? (
        <p className={styles.pickerEmpty}>
          No Part stacks yet. Make one with New calculation → Tolerance Stack-up → Part, or add this part as a dimension instead.
        </p>
      ) : (
        <div className={styles.pickerBody}>
          <SearchField label="Search part stacks" placeholder="Search part stacks" size="md" value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className={styles.pickerList} role="listbox" aria-label="Part stacks">
            {groups.length === 0 && <p className={styles.pickerEmpty}>No part stack matches “{query.trim()}”.</p>}
            {groups.map((group) => (
              <div key={group.folderId ?? 'home'} role="group" aria-label={group.parts[0].folderName}>
                <div className={styles.pickerFolder}>
                  <Icon name="folder" size={13} />
                  {group.parts[0].folderName}
                </div>
                {group.parts.map((part) => (
                  <PartOption
                    key={part.calculation.id}
                    part={part}
                    system={system}
                    chosen={chosen === part.calculation.id}
                    linked={linkedIds.has(part.calculation.id)}
                    onChoose={() => setChosen(part.calculation.id)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </Dialog>
  )
}

function PartOption({ part, system, chosen, linked, onChoose }: { part: PartStack; system: UnitSystem; chosen: boolean; linked: boolean; onChoose: () => void }) {
  const { calculation, inputs, analysis } = part
  const usable = analysis.ok
  const status = analysis.ok ? statusOf(analysis.value) : null
  return (
    <button
      type="button"
      role="option"
      aria-selected={chosen}
      disabled={!usable}
      className={cx(styles.partOption, chosen && styles.partChosen)}
      onClick={onChoose}
    >
      <Icon name="tool-stack" size={16} className={styles.partIcon} />
      <span className={styles.partNames}>
        <span className={styles.partCalc}>{calculation.name}</span>
        <span className={styles.partSub}>
          {inputs.partName.trim() || 'Part'} · {inputs.resultName.trim() || 'Result'}
          {linked && <span className={styles.inThisStack}>In this stack</span>}
        </span>
      </span>
      <span className={styles.partValue}>
        {analysis.ok ? (
          <>
            <span className={styles.mono}>{partResultText(system, analysis.value.stackResult)}</span>
            {status && (
              <span className={styles.partStatus}>
                <Marker color={STATUS_TONE[status]} />
                {STATUS_WORD[status]}
              </span>
            )}
          </>
        ) : (
          <>
            <span className={styles.muted}>No result</span>
            <span className={styles.inThisStack}>Fix it first</span>
          </>
        )}
      </span>
    </button>
  )
}
