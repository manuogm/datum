// NewProjectDrawer: the "New project" panel of the Projects page. Creating
// the project makes it the active one and opens its page.
import { useState } from 'react'
import { nextProjectCode } from '../../core/projects'
import { routeHref } from '../router/routes'
import { Button, Drawer } from '../ui'
import { CURRENT_USER } from '../user.fixtures'
import { FormError } from './FormError'
import { emptyDraft, programsOf } from './projectDraft'
import { ProjectForm } from './ProjectForm'
import { useProjects } from './useProjects'

export function NewProjectDrawer({ onClose }: { onClose: () => void }) {
  const { projects, actions } = useProjects()
  const programs = programsOf(projects)
  const [draft, setDraft] = useState(() => emptyDraft(CURRENT_USER, programs[0]))
  const [error, setError] = useState<string | null>(null)

  const create = () => {
    const created = actions.createProject(draft)
    if (created.ok) window.location.assign(routeHref({ name: 'project', id: created.value.id }))
    else setError(created.error)
  }

  return (
    <Drawer
      title="New project"
      onClose={onClose}
      onSubmit={create}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            Create project
          </Button>
        </>
      }
    >
      <ProjectForm draft={draft} onChange={setDraft} code={nextProjectCode(projects)} programs={programs} />
      <FormError message={error} />
    </Drawer>
  )
}
