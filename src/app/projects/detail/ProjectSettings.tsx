// ProjectSettings: edit the project's details, parts, targets and team, and
// release or reopen it. Released projects accept no new revisions.
import { useState } from 'react'
import type { Project } from '../../../core/projects'
import { Badge, Button, MonoLabel } from '../../ui'
import { FormError } from '../FormError'
import { draftFromProject, programsOf } from '../projectDraft'
import { ProjectForm } from '../ProjectForm'
import { useProjects } from '../useProjects'
import styles from './ProjectSettings.module.css'

export function ProjectSettings({ project }: { project: Project }) {
  const { projects, actions } = useProjects()
  const [draft, setDraft] = useState(() => draftFromProject(project))
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null)
  const programs = programsOf(projects)
  const lockedPartIds = new Set(project.calculations.map((c) => c.partId))
  const released = project.stage === 'released'

  const save = () => {
    const result = actions.updateProject(project.id, draft)
    setMessage(result.ok ? { error: false, text: 'Saved.' } : { error: true, text: result.error })
  }

  return (
    <div className={styles.settings}>
      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <ProjectForm
          draft={draft}
          onChange={setDraft}
          code={project.id}
          programs={programs}
          lockedPartIds={lockedPartIds}
        />
        {message?.error ? <FormError message={message.text} /> : <p className={styles.saved}>{message?.text}</p>}
        <div className={styles.actions}>
          <Button variant="primary" type="submit">
            Save changes
          </Button>
        </div>
      </form>
      <section className={styles.stage} aria-labelledby="stage-heading">
        <MonoLabel as="h2" id="stage-heading">
          Stage
        </MonoLabel>
        <Badge tone={released ? 'neutral' : 'hole'} size="md">
          {released ? 'Released' : 'Open'}
        </Badge>
        <p className={styles.note}>
          {released
            ? 'The design is frozen: no new revisions can be saved. Reopen the project to continue work.'
            : 'Release the project once the design is frozen. Its history stays readable; new revisions are blocked.'}
        </p>
        <Button onClick={() => actions.setStage(project.id, released ? 'open' : 'released')}>
          {released ? 'Reopen project' : 'Release project'}
        </Button>
      </section>
    </div>
  )
}
