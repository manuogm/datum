// DeleteDialog: confirms deleting a folder (with everything in it) or a
// calculation. Nothing is deleted without this confirmation. When an
// assembly stack links a part stack that goes, it says so: the assembly
// keeps the part's last values and shows the link as missing.
import { folderAndBelow, folderContents, type Calculation, type Library } from '../../core/library'
import { assembliesLinking } from '../../tools/stackup/ui/state/linkedParts'
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
      <LinkedByNote assemblies={linkingAssemblies(library, entry)} />
    </Dialog>
  )
}

/** The assemblies, kept, that link a part stack this deletes. */
function linkingAssemblies(library: Library, entry: Entry): Calculation[] {
  if (entry.kind === 'calculation') return assembliesLinking(library, [entry.calculation.id])
  const doomed = folderAndBelow(library, entry.folder.id)
  const inside = library.calculations.filter((c) => c.folderId !== null && doomed.has(c.folderId))
  return assembliesLinking(library, inside.map((c) => c.id)).filter((c) => c.folderId === null || !doomed.has(c.folderId))
}

function LinkedByNote({ assemblies }: { assemblies: readonly Calculation[] }) {
  if (assemblies.length === 0) return null
  return (
    <p className={styles.text}>
      Used by {countOf(assemblies.length, 'assembly', 'assemblies')}: {assemblies.map((c) => c.name).join(', ')}. They keep the last values of
      the part stack and show the link as missing.
    </p>
  )
}

function consequence(library: Library, entry: Entry): string {
  if (entry.kind === 'calculation') return 'The calculation and its inputs are deleted.'
  const { folders, calculations } = folderContents(library, entry.folder.id)
  if (folders + calculations === 0) return 'The folder is empty.'
  const inside = [folders > 0 && countOf(folders, 'folder'), calculations > 0 && countOf(calculations, 'calculation')]
  return `Everything inside is deleted with it: ${inside.filter(Boolean).join(' and ')}.`
}
