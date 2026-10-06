// Home: the library as a folder directory. A breadcrumb down to the folder
// shown, its folders first and then its calculations, and the actions to add
// a folder or a calculation here. Each row has a menu to rename, duplicate,
// move or delete it; clicking a calculation opens it as a tab.
import { useEffect, useState } from 'react'
import { calculationsIn, findFolder, folderPath, subfolders } from '../../core/library'
import { AppLayout } from '../AppLayout'
import { countOf } from '../format/count'
import { libraryActions, useLibrary } from '../library/useLibrary'
import { rememberHomeFolder } from '../shell/openTabs'
import { Button, Callout, EmptyState, PageTitle } from '../ui'
import { Breadcrumb } from './Breadcrumb'
import { DeleteDialog } from './DeleteDialog'
import { DirectoryList } from './DirectoryList'
import { entryName, type Entry } from './entry'
import styles from './HomePage.module.css'
import { MoveDialog } from './MoveDialog'
import { NameDialog } from './NameDialog'
import { NewCalculationDialog } from './NewCalculationDialog'

/** The dialog open over Home, if any. */
type OpenDialog =
  | { kind: 'new-folder' }
  | { kind: 'new-calculation' }
  | { kind: 'rename' | 'move' | 'delete'; entry: Entry }

export function HomePage({ folderId }: { folderId: string | null }) {
  const { library, problem } = useLibrary()
  const [dialog, setDialog] = useState<OpenDialog | null>(null)
  const folder = folderId === null ? undefined : findFolder(library, folderId)
  const folders = subfolders(library, folderId)
  const calculations = calculationsIn(library, folderId)
  const close = () => setDialog(null)

  useEffect(() => rememberHomeFolder(folderId), [folderId])

  const duplicate = (entry: Entry) => {
    if (entry.kind === 'calculation') libraryActions.duplicateCalculation(entry.calculation.id)
  }

  return (
    <AppLayout current={{ tab: 'home' }}>
      <div className={styles.page}>
        <header className={styles.head}>
          <PageTitle eyebrow={<Breadcrumb path={folderPath(library, folderId)} />} title={folder?.name ?? 'Home'} size="md" />
          <div className={styles.actions}>
            <span className={styles.count}>
              {countOf(folders.length, 'folder')} · {countOf(calculations.length, 'calculation')}
            </span>
            <Button size="md" icon="plus" onClick={() => setDialog({ kind: 'new-folder' })}>
              New folder
            </Button>
            <Button size="md" variant="primary" icon="plus" onClick={() => setDialog({ kind: 'new-calculation' })}>
              New calculation
            </Button>
          </div>
        </header>
        {problem && (
          <div className={styles.notice}>
            <Callout status="warn" title="Library storage">
              {problem}
            </Callout>
          </div>
        )}
        {folders.length + calculations.length > 0 ? (
          <DirectoryList
            library={library}
            folders={folders}
            calculations={calculations}
            onRename={(entry) => setDialog({ kind: 'rename', entry })}
            onDuplicate={duplicate}
            onMove={(entry) => setDialog({ kind: 'move', entry })}
            onDelete={(entry) => setDialog({ kind: 'delete', entry })}
          />
        ) : (
          <EmptyState inset="page">
            {folderId === null ? 'Nothing here yet.' : 'This folder is empty.'} Create a calculation, or a folder to group
            calculations in.
          </EmptyState>
        )}
      </div>

      {dialog?.kind === 'new-folder' && (
        <NameDialog
          title="New folder"
          subtitle={`In ${folder?.name ?? 'Home'}`}
          label="Folder name"
          initialName=""
          submitLabel="Create folder"
          onSubmit={(name) => libraryActions.createFolder(name, folderId)}
          onClose={close}
        />
      )}
      {dialog?.kind === 'new-calculation' && <NewCalculationDialog library={library} folderId={folderId} onClose={close} />}
      {dialog?.kind === 'rename' && (
        <NameDialog
          title={dialog.entry.kind === 'folder' ? 'Rename folder' : 'Rename calculation'}
          label="Name"
          initialName={entryName(dialog.entry)}
          submitLabel="Rename"
          onSubmit={(name) =>
            dialog.entry.kind === 'folder'
              ? libraryActions.renameFolder(dialog.entry.folder.id, name)
              : libraryActions.renameCalculation(dialog.entry.calculation.id, name)
          }
          onClose={close}
        />
      )}
      {dialog?.kind === 'move' && <MoveDialog library={library} entry={dialog.entry} onClose={close} />}
      {dialog?.kind === 'delete' && <DeleteDialog library={library} entry={dialog.entry} onClose={close} />}
    </AppLayout>
  )
}
