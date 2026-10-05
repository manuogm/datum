// PartsEditor: the project's parts as chips; parts can be added, and removed
// while no calculation has been saved against them.
import type { ProjectDraft } from '../../core/projects'
import { Chip, Icon, MonoLabel } from '../ui'
import { InlineAdd } from './InlineAdd'
import styles from './PartsEditor.module.css'

type DraftPart = ProjectDraft['parts'][number]

interface PartsEditorProps {
  parts: DraftPart[]
  onChange: (parts: DraftPart[]) => void
  /** Parts that have saved calculations and so cannot be removed. */
  lockedPartIds?: ReadonlySet<string>
}

export function PartsEditor({ parts, onChange, lockedPartIds }: PartsEditorProps) {
  return (
    <div className={styles.parts} role="group" aria-label="Parts">
      <MonoLabel>Parts</MonoLabel>
      <div className={styles.chips}>
        {parts.map((part, index) => (
          <Chip key={part.id ?? `new-${part.name}`} variant="tag">
            {part.name}
            {!(part.id && lockedPartIds?.has(part.id)) && (
              <button
                type="button"
                className={styles.remove}
                aria-label={`Remove ${part.name}`}
                onClick={() => onChange(parts.filter((_, i) => i !== index))}
              >
                <Icon name="close" size={8} />
              </button>
            )}
          </Chip>
        ))}
        <InlineAdd label="+ Add part" inputLabel="New part name" onAdd={(name) => onChange([...parts, { name }])} />
      </div>
    </div>
  )
}
