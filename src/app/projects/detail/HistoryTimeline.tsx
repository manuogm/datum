// HistoryTimeline: every saved revision of the project, newest first,
// filtered by the part chosen in the sidebar, by tool, and optionally
// without superseded revisions.
import { useState } from 'react'
import { isSuperseded, revisionsNewestFirst, TOOL_IDS, TOOLS, type Project, type ToolId } from '../../../core/projects'
import { Chip, EmptyState, MonoLabel, Select } from '../../ui'
import styles from './HistoryTimeline.module.css'
import { TimelineEntry } from './TimelineEntry'

type ToolFilter = ToolId | 'all'

const TOOL_OPTIONS: readonly { value: ToolFilter; label: string }[] = [
  { value: 'all', label: 'All tools' },
  ...TOOL_IDS.map((tool) => ({ value: tool, label: TOOLS[tool].name })),
]

interface HistoryTimelineProps {
  project: Project
  partId: string | null
}

export function HistoryTimeline({ project, partId }: HistoryTimelineProps) {
  const [tool, setTool] = useState<ToolFilter>('all')
  const [showSuperseded, setShowSuperseded] = useState(true)
  const entries = revisionsNewestFirst(project).filter(
    (e) =>
      (partId === null || e.calculation.partId === partId) &&
      (tool === 'all' || e.calculation.tool === tool) &&
      (showSuperseded || !isSuperseded(e.calculation, e.revision)),
  )
  const partName = project.parts.find((p) => p.id === partId)?.name ?? 'All parts'
  const toolName = tool === 'all' ? 'All tools' : TOOLS[tool].name
  return (
    <section className={styles.history} aria-labelledby="history-heading">
      <div className={styles.head}>
        <MonoLabel as="h2" id="history-heading" className={styles.heading}>
          History · {partName} · {toolName}
        </MonoLabel>
        <Select size="sm" aria-label="Tool" className={styles.filter} options={TOOL_OPTIONS} value={tool} onChange={setTool} />
        <Chip variant="filter" selected={showSuperseded} onClick={() => setShowSuperseded(!showSuperseded)}>
          Show superseded
        </Chip>
      </div>
      {entries.length > 0 ? (
        <ol className={styles.entries}>
          {entries.map((entry, i) => (
            <TimelineEntry key={entry.revision.id} entry={entry} latest={i === 0} />
          ))}
        </ol>
      ) : (
        <EmptyState inset="none">
          No saved revisions here yet. Use “+ New calculation”, then “Save revision” in the tool.
        </EmptyState>
      )}
    </section>
  )
}
