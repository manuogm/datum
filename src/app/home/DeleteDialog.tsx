// DeleteDialog: confirms deleting a folder (with everything in it) or a
// calculation. Nothing is deleted without this confirmation.
import { folderContents, type Library } from '../../core/library'
import { countOf } from '../format/count'
import { libraryActions } from '../library/useLibrary'
import { Button, Dialog } from '../ui'
import styles from './dialogs.module.css'
import { entryName, type Entry } from './entry'

interface DeleteDialogProps {
  library: Library
  entry: Entry
  onClose: () => void
}

export function DeleteDialog({ library, entry, onClose }: DeleteDialogProps) {
  const remove = () => {
    if (entry.kind === 'folder') libraryActions.deleteFolder(entry.folder.id)
    else libraryActions.deleteCalculation(entry.calculation.id)
    onClose()
  }
  return (
    <Dialog
      title={`Delete “${entryName(entry)}”?`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose} data-autofocus>
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={remove}>
            Delete
          </Button>
        </>
      }
    >
      <p className={styles.text}>{consequence(library, entry)} This cannot be undone.</p>
    </Dialog>
  )
}

function consequence(library: Library, entry: Entry): string {
  if (entry.kind === 'calculation') return 'The calculation and its inputs are deleted.'
  const { folders, calculations } = folderContents(library, entry.folder.id)
  if (folders + calculations === 0) return 'The folder is empty.'
  const inside = [folders > 0 && countOf(folders, 'folder'), calculations > 0 && countOf(calculations, 'calculation')]
  return `Everything inside is deleted with it: ${inside.filter(Boolean).join(' and ')}.`
}
