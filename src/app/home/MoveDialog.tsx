// MoveDialog: moves a folder or a calculation to another folder, picked from
// the whole folder tree. The current place cannot be picked, nor (for a
// folder) the folder itself or anything inside it.
import { useState, type CSSProperties } from 'react'
import { folderAndBelow, subfolders, type Folder, type Library } from '../../core/library'
import { libraryActions } from '../library/useLibrary'
import { Button, cx, Dialog, Icon } from '../ui'
import styles from './dialogs.module.css'
import { entryName, type Entry } from './entry'

interface MoveDialogProps {
  library: Library
  entry: Entry
  onClose: () => void
}

/** Every folder in tree order, with its depth (the top level, Home, is depth 0). */
function folderTree(library: Library, parentId: string | null = null, depth = 1): { folder: Folder; depth: number }[] {
  return subfolders(library, parentId).flatMap((folder) => [{ folder, depth }, ...folderTree(library, folder.id, depth + 1)])
}

export function MoveDialog({ library, entry, onClose }: MoveDialogProps) {
  const currentPlace = entry.kind === 'folder' ? entry.folder.parentId : entry.calculation.folderId
  const excluded = entry.kind === 'folder' ? folderAndBelow(library, entry.folder.id) : new Set<string>()
  const [target, setTarget] = useState<string | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  const move = () => {
    if (target === undefined) return
    const result =
      entry.kind === 'folder'
        ? libraryActions.moveFolder(entry.folder.id, target)
        : libraryActions.moveCalculation(entry.calculation.id, target)
    if (result.ok) onClose()
    else setError(result.error)
  }

  const destinations = [{ id: null, name: 'Home', depth: 0 }, ...folderTree(library).map(({ folder, depth }) => ({ id: folder.id, name: folder.name, depth }))]

  return (
    <Dialog
      title={`Move “${entryName(entry)}”`}
      subtitle="Choose a folder"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={move} disabled={target === undefined}>
            Move here
          </Button>
        </>
      }
    >
      <ul className={styles.tree} aria-label="Folders">
        {destinations.map(({ id, name, depth }) => {
          const isCurrent = id === currentPlace
          const blocked = isCurrent || (id !== null && excluded.has(id))
          return (
            <li key={id ?? 'home'}>
              <button
                type="button"
                className={cx(styles.destination, target === id && styles.chosen)}
                style={{ '--depth': depth } as CSSProperties}
                disabled={blocked}
                aria-pressed={target === id}
                onClick={() => {
                  setTarget(id)
                  setError(null)
                }}
              >
                <Icon name="folder" size={14} />
                {name}
                {isCurrent && <span className={styles.note}>Current</span>}
              </button>
            </li>
          )
        })}
      </ul>
      {error && <p className={styles.error}>{error}</p>}
    </Dialog>
  )
}
