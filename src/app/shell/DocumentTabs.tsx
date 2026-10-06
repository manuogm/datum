// DocumentTabs: the tabs of the top bar. Home comes first and cannot be
// closed; then one tab per open calculation (tool glyph, name, a dot while it
// has unsaved changes, ×). Closing a tab with unsaved changes asks first:
// Save, Exit without saving, or Cancel. Closing the tab being shown moves to
// its neighbour, or back to Home when it was the last one. A tab whose
// calculation no longer exists is dropped, with its unsaved changes.
import { useEffect, useState } from 'react'
import { findCalculation, type Calculation } from '../../core/library'
import { discardDraft, saveDraft, useDrafts } from '../library/drafts'
import { useLibrary } from '../library/useLibrary'
import { calcHref, folderHref } from '../router/routes'
import { Button, cx, Dialog, Icon } from '../ui'
import styles from './DocumentTabs.module.css'
import { closeTab, lastHomeFolder, useOpenTabs } from './openTabs'
import { tabAfterClosing } from './tabList'
import { TOOL_ICONS } from './toolIcons'

/** Which tab is shown: Home, a calculation's, or none (the Materials page). */
export type CurrentTab = { tab: 'home' } | { tab: 'calc'; id: string } | null

export function DocumentTabs({ current }: { current: CurrentTab }) {
  const { library } = useLibrary()
  const ids = useOpenTabs()
  const drafts = useDrafts()
  const [asking, setAsking] = useState<Calculation | null>(null)
  const calculations = ids.flatMap((id) => findCalculation(library, id) ?? [])

  // Forget tabs of calculations deleted here or in another browser tab.
  useEffect(() => {
    for (const id of ids) {
      if (findCalculation(library, id)) continue
      discardDraft(id)
      closeTab(id)
    }
  }, [ids, library])

  const currentId = current?.tab === 'calc' ? current.id : null
  const close = (id: string) => {
    if (id === currentId) {
      const next = tabAfterClosing(calculations.map((c) => c.id), id)
      window.location.assign(next ? calcHref(next) : folderHref(lastHomeFolder()))
    }
    closeTab(id)
  }
  const askToClose = (calculation: Calculation) => {
    if (drafts.has(calculation.id)) setAsking(calculation)
    else close(calculation.id)
  }

  return (
    <nav className={styles.bar} aria-label="Open documents">
      <a
        className={cx(styles.tab, styles.home, current?.tab === 'home' && styles.active)}
        href={folderHref(lastHomeFolder())}
        aria-current={current?.tab === 'home' ? 'page' : undefined}
      >
        Home
      </a>
      {calculations.map((calculation) => (
        <CalculationTab
          key={calculation.id}
          calculation={calculation}
          active={calculation.id === currentId}
          unsaved={drafts.has(calculation.id)}
          onClose={askToClose}
        />
      ))}
      {asking && (
        <UnsavedChangesDialog
          name={asking.name}
          onSave={() => {
            setAsking(null)
            if (saveDraft(asking.id)) close(asking.id)
          }}
          onDiscard={() => {
            setAsking(null)
            discardDraft(asking.id)
            close(asking.id)
          }}
          onCancel={() => setAsking(null)}
        />
      )}
    </nav>
  )
}

interface CalculationTabProps {
  calculation: Calculation
  active: boolean
  unsaved: boolean
  onClose: (calculation: Calculation) => void
}

function CalculationTab({ calculation, active, unsaved, onClose }: CalculationTabProps) {
  const { id, name, tool } = calculation
  return (
    <div
      className={cx(styles.tab, styles.calc, active && styles.active)}
      // Middle click closes, as in a browser.
      onAuxClick={(event) => {
        if (event.button === 1) {
          event.preventDefault()
          onClose(calculation)
        }
      }}
    >
      <a className={styles.link} href={calcHref(id)} title={name} aria-current={active ? 'page' : undefined}>
        <Icon name={TOOL_ICONS[tool]} size={12} className={styles.glyph} />
        <span className={styles.name}>{name}</span>
      </a>
      {/* The dot of unsaved changes gives way to the × on hover, as in an editor. */}
      <button
        type="button"
        className={cx(styles.close, unsaved && styles.unsaved)}
        onClick={() => onClose(calculation)}
        aria-label={unsaved ? `Close ${name} (unsaved changes)` : `Close ${name}`}
        title={unsaved ? 'Unsaved changes' : undefined}
      >
        <span className={styles.dot} aria-hidden="true" />
        <Icon name="close" size={10} className={styles.cross} />
      </button>
    </div>
  )
}

interface UnsavedChangesDialogProps {
  name: string
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}

function UnsavedChangesDialog({ name, onSave, onDiscard, onCancel }: UnsavedChangesDialogProps) {
  return (
    <Dialog
      title={`Save changes to “${name}”?`}
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="md" onClick={onDiscard}>
            Exit without saving
          </Button>
          <Button variant="primary" size="md" onClick={onSave} data-autofocus>
            Save
          </Button>
        </>
      }
    >
      <p className={styles.question}>Your changes to this calculation are lost if you close it without saving.</p>
    </Dialog>
  )
}
