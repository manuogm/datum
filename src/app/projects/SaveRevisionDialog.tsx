// SaveRevisionDialog ("Save to Project" design): saves a tool's snapshot as
// the next revision of a part's calculation, with a note, an optional design
// decision and the PDF report flag.
//
// Usage from a tool page:
//   const [saving, setSaving] = useState(false)
//   <AppLayout toolActions={{ onSaveRevision: () => setSaving(true), … }}>
//   {saving && <SaveRevisionDialog snapshot={buildSnapshot()} onClose={() => setSaving(false)} />}
import { useState } from 'react'
import {
  approverOf,
  currentRevision,
  findCalculation,
  nextCalculationId,
  nextDecisionId,
  revLetter,
  TOOLS,
  type Project,
  type ToolSnapshot,
} from '../../core/projects'
import { Avatar, Button, Checkbox, Dialog, EmptyState, Field, Marker, MonoLabel, Select, Switch, TextArea } from '../ui'
import { FigureChangesTable } from './FigureChangesTable'
import { FormError } from './FormError'
import { NEW_PROJECT_HREF } from './newProjectLink'
import styles from './SaveRevisionDialog.module.css'
import { useProjects } from './useProjects'

const NEW_PART = '+new'

interface SaveRevisionDialogProps {
  snapshot: ToolSnapshot
  onClose: () => void
  /** Called with the new revision's id (e.g. "FT-0412-C") after saving. */
  onSaved?: (revisionId: string) => void
}

export function SaveRevisionDialog({ snapshot, onClose, onSaved }: SaveRevisionDialogProps) {
  const { projects, active, actions } = useProjects()
  const openProjects = projects.filter((p) => p.stage === 'open')
  const initialProject = openProjects.find((p) => p.id === active?.projectId) ?? openProjects[0]

  const [projectId, setProjectId] = useState(initialProject?.id ?? '')
  const [partId, setPartId] = useState(() => defaultPart(initialProject, active?.partId))
  const [newPartName, setNewPartName] = useState('')
  const [note, setNote] = useState('')
  const [recordDecision, setRecordDecision] = useState(false)
  const [decisionTitle, setDecisionTitle] = useState('')
  const [reportAttached, setReportAttached] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tool = TOOLS[snapshot.tool]
  const project = openProjects.find((p) => p.id === projectId)
  if (!project) {
    return (
      <Dialog title="Save revision to project" subtitle={tool.name} onClose={onClose}>
        <EmptyState inset="none">
          There is no open project to save to. <a href={NEW_PROJECT_HREF}>Create a project</a> first.
        </EmptyState>
      </Dialog>
    )
  }

  const calculation = partId === NEW_PART ? undefined : findCalculation(project, partId, snapshot.tool)
  const previous = calculation && currentRevision(calculation)
  const rev = revLetter(calculation?.revisions.length ?? 0)
  const approver = approverOf(project)

  const chooseProject = (id: string) => {
    setProjectId(id)
    setPartId(defaultPart(openProjects.find((p) => p.id === id)))
  }

  const save = () => {
    const result = actions.saveRevision({
      projectId: project.id,
      part: partId === NEW_PART ? { newName: newPartName } : { id: partId },
      snapshot,
      note,
      reportAttached,
      decisionTitle: recordDecision ? decisionTitle : undefined,
    })
    if (!result.ok) {
      setError(result.error)
      return
    }
    onSaved?.(result.value)
    onClose()
  }

  return (
    <Dialog
      title="Save revision to project"
      subtitle={`${tool.name} · ${calculation?.id ?? `${nextCalculationId(projects, snapshot.tool)} (new)`}`}
      onClose={onClose}
      footerNote={previous ? `Rev ${previous.rev} stays in history` : 'Starts a new calculation'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            Save Rev {rev}
          </Button>
        </>
      }
    >
      <div className={styles.target}>
        <Select
          label="Project"
          size="sm"
          leading={<Marker shape="diamond" size={7} />}
          options={openProjects.map((p) => ({ value: p.id, label: p.name }))}
          value={project.id}
          onChange={chooseProject}
        />
        <Select
          label="Part"
          size="sm"
          options={[...project.parts.map((p) => ({ value: p.id, label: p.name })), { value: NEW_PART, label: 'New part…' }]}
          value={partId}
          onChange={setPartId}
        />
        <div className={styles.rev}>
          <MonoLabel>Rev</MonoLabel>
          <output className={styles.revBox} aria-label={`Revision ${rev}`}>
            {rev}
          </output>
        </div>
      </div>
      {partId === NEW_PART && (
        <Field
          label="New part"
          size="sm"
          placeholder="e.g. Bearing carrier pin"
          value={newPartName}
          onChange={(event) => setNewPartName(event.target.value)}
        />
      )}
      <FigureChangesTable before={previous} after={snapshot} />
      <TextArea
        label="Note"
        data-autofocus
        placeholder="What changed and why"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className={styles.decision}>
        <div className={styles.decisionHead}>
          <Checkbox size="md" checked={recordDecision} onChange={setRecordDecision}>
            <span className={styles.decisionLabel}>Record as design decision</span>
          </Checkbox>
          <span className={styles.decisionId}>{nextDecisionId(project)}</span>
        </div>
        {recordDecision && (
          <>
            <Field
              size="sm"
              aria-label="Decision"
              placeholder="e.g. Carrier pin fit changed to H7/p6"
              value={decisionTitle}
              onChange={(event) => setDecisionTitle(event.target.value)}
            />
            <div className={styles.approver}>
              Approver
              {approver ? (
                <span className={styles.person}>
                  <Avatar initials={approver.initials} size="xs" />
                  {approver.name}
                </span>
              ) : (
                <span className={styles.noApprover}>none named in this project</span>
              )}
            </div>
          </>
        )}
      </div>
      <Switch checked={reportAttached} onChange={setReportAttached}>
        Attach PDF report to this revision
      </Switch>
      <FormError message={error} />
    </Dialog>
  )
}

/** The active part when it belongs to the project, else its first part, else a new part. */
function defaultPart(project: Project | undefined, activePartId?: string): string {
  if (!project) return NEW_PART
  if (activePartId && project.parts.some((p) => p.id === activePartId)) return activePartId
  return project.parts[0]?.id ?? NEW_PART
}
