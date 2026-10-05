// Projects page ("Projects" design): every project with its status, filtered
// by stage and text, and the New project drawer docked on the right.
import { useMemo, useState } from 'react'
import { projectStats } from '../../core/projects'
import { AppLayout } from '../AppLayout'
import { Button, Callout, EmptyState, PageTitle, SearchField, SegmentedControl } from '../ui'
import { asksForNewProject } from './newProjectLink'
import { NewProjectDrawer } from './NewProjectDrawer'
import { filterProjects, PROJECT_VIEWS, type ProjectView } from './projectFilter'
import styles from './ProjectsPage.module.css'
import { ProjectsTable } from './ProjectsTable'
import { useProjects } from './useProjects'
import { countOf } from '../format/count'

export function ProjectsPage() {
  const { projects, active, problem } = useProjects()
  const [view, setView] = useState<ProjectView>('all')
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(() => asksForNewProject(window.location.hash))

  const rows = useMemo(() => projects.map((project) => ({ project, stats: projectStats(project) })), [projects])
  const shown = filterProjects(rows, view, query)
  const calculationCount = rows.reduce((sum, row) => sum + row.stats.calculationCount, 0)

  return (
    <AppLayout section="projects">
      <div className={styles.layout}>
        <div className={styles.main} inert={creating}>
          <header className={styles.head}>
            <PageTitle eyebrow={`${countOf(projects.length, 'project')} · ${countOf(calculationCount, 'calculation')}`} title="Projects" />
            <div className={styles.controls}>
              <SegmentedControl variant="joined" label="Show" options={PROJECT_VIEWS} value={view} onChange={setView} />
              <SearchField
                label="Filter projects"
                placeholder="Filter projects"
                size="sm"
                className={styles.search}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {!creating && (
                <Button variant="primary" size="md" onClick={() => setCreating(true)}>
                  + New project
                </Button>
              )}
            </div>
          </header>
          {problem && (
            <div className={styles.notice}>
              <Callout status="warn" title="Project storage">
                {problem}
              </Callout>
            </div>
          )}
          <ProjectsTable rows={shown} highlightId={active?.projectId} />
          {shown.length === 0 && <EmptyState inset="page">No projects match. Clear the filter or create one.</EmptyState>}
        </div>
        {creating && <NewProjectDrawer onClose={() => setCreating(false)} />}
      </div>
    </AppLayout>
  )
}
