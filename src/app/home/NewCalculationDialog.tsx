// NewCalculationDialog: pick a tool from its card, name the calculation
// (prefilled "Fit 1", "Bolt 2" … until the name is edited) and create it in
// the folder shown. It is stored at once with the tool's example inputs and
// opens as a tab.
import { useState } from 'react'
import { defaultCalculationName, findFolder, TOOL_IDS, TOOLS, type Library, type ToolId } from '../../core/library'
import { libraryActions } from '../library/useLibrary'
import { calcHref } from '../router/routes'
import { TOOL_ICONS } from '../shell/toolIcons'
import { summaryFor } from '../tools/toolDefinition'
import { loadToolDefinition } from '../tools/toolModules'
import { Button, cx, Dialog, Field, Icon } from '../ui'
import styles from './dialogs.module.css'
import { ToolIllustration } from './ToolIllustration'

interface NewCalculationDialogProps {
  library: Library
  folderId: string | null
  onClose: () => void
}

export function NewCalculationDialog({ library, folderId, onClose }: NewCalculationDialogProps) {
  const [tool, setTool] = useState<ToolId>('fit')
  // null: the suggested name of the picked tool; a string once the user types.
  const [typedName, setTypedName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const name = typedName ?? defaultCalculationName(library, folderId, tool)
  const folderName = folderId === null ? 'Home' : (findFolder(library, folderId)?.name ?? 'Home')

  const create = async () => {
    setCreating(true)
    try {
      // The tool's own module knows its example inputs and how to summarise them.
      const definition = await loadToolDefinition(tool)
      const inputs = definition.defaultInputs
      const created = libraryActions.createCalculation({ tool, name, folderId, inputs, summary: summaryFor(definition, inputs) })
      if (!created.ok) {
        setError(created.error)
        return
      }
      onClose()
      window.location.assign(calcHref(created.value))
    } catch {
      setError('The tool could not be loaded. Check the connection and try again.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog
      title="New calculation"
      subtitle={`In ${folderName}`}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="md" type="submit" form="new-calculation-form" disabled={creating}>
            Create
          </Button>
        </>
      }
    >
      <div className={styles.tools} role="group" aria-label="Tool">
        {TOOL_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={cx(styles.tool, id === tool && styles.picked)}
            aria-pressed={id === tool}
            onClick={() => setTool(id)}
            data-autofocus={id === tool ? true : undefined}
          >
            <span className={styles.toolHead}>
              <Icon name={TOOL_ICONS[id]} size={14} />
              {TOOLS[id].name}
            </span>
            <span className={styles.figure}>
              <ToolIllustration tool={id} width={180} />
            </span>
            <span className={styles.useWhen}>{TOOLS[id].useWhen}</span>
          </button>
        ))}
      </div>
      <form
        id="new-calculation-form"
        onSubmit={(event) => {
          event.preventDefault()
          void create()
        }}
      >
        <Field
          label="Name"
          size="md"
          value={name}
          onChange={(event) => {
            setTypedName(event.target.value)
            setError(null)
          }}
        />
      </form>
      {error && <p className={styles.error}>{error}</p>}
    </Dialog>
  )
}
