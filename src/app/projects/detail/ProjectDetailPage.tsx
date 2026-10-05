// Project page ("Project Detail" design): header with status and actions,
// tabs, the parts / targets / team sidebar, and the selected tab: history
// timeline with decisions, calculations, decisions, reports or settings.
import { useEffect, useState } from 'react'
import { currentRevision, partOf, projectStats, revisionsNewestFirst, type Project } from '../../../core/projects'
import { AppLayout } from '../../AppLayout'
import { PlaceholderPage } from '../../pages/PlaceholderPage'
import { routeHref } from '../../router/routes'
import { Badge, Button, PageTitle, TabBar } from '../../ui'
import { PROJECT_STATUS_TONE } from '../projectSummary'
import { useProjects } from '../useProjects'
import { DecisionsPanel } from './DecisionsPanel'
import { exportDossier } from './exportDossier'
import { HistoryTimeline } from './HistoryTimeline'
import styles from './ProjectDetailPage.module.css'
import { ProjectSettings } from './ProjectSettings'
import { ProjectSidebar } from './ProjectSidebar'
import { RevisionTable } from './RevisionTable'

type Tab = 'timeline' | 'calculations' | 'decisions' | 'reports' | 'settings'

export function ProjectDetailPage({ id }: { id: string }) {
  const { projects } = useProjects()
  const project = projects.find((p) => p.id === id)
  if (!project) {
    return (
      <PlaceholderPage
        section="projects"
        eyebrow={`Projects / ${id}`}
        title="Project not found"
        status="missing"
        message="There is no project with this code in this browser. Projects are stored locally, per browser."
        scope={[]}
      />
    )
  }
  return <ProjectDetail key={project.id} project={project} />
}

function ProjectDetail({ project }: { project: Project }) {
  const { active, actions } = useProjects()
  const [tab, setTab] = useState<Tab>('timeline')
  const [partId, setPartId] = useState<string | null>(null)
  const stats = projectStats(project)

  // Opening a project makes it the one new calculations are saved to.
  useEffect(() => {
    if (active?.projectId !== project.id) actions.setActive({ projectId: project.id })
  }, [active?.projectId, project.id, actions])

  const startCalculation = () => {
    actions.setActive({ projectId: project.id, partId: partId ?? undefined })
    window.location.assign(routeHref({ name: 'fit' }))
  }

  const reports = revisionsNewestFirst(project).filter((r) => r.revision.reportAttached)
  const tabs = [
    { key: 'timeline', label: 'Timeline' },
    { key: 'calculations', label: 'Calculations', count: stats.calculationCount },
    { key: 'decisions', label: 'Decisions', count: stats.decisionCount },
    { key: 'reports', label: 'Reports', count: reports.length },
    { key: 'settings', label: 'Settings' },
  ]

  return (
    <AppLayout section="projects" project={{ name: project.name }}>
      <header className={styles.head}>
        <div className={styles.titleRow}>
          <PageTitle
            size="md"
            eyebrow={
              <>
                <a className={styles.crumb} href={routeHref({ name: 'projects' })}>
                  Projects
                </a>{' '}
                / {project.id}
                {project.program && ` · ${project.program} program`}
              </>
            }
            title={project.name}
          >
            <Badge tone={PROJECT_STATUS_TONE[stats.status]} size="md">
              {statusText(stats)}
            </Badge>
          </PageTitle>
          <div className={styles.actions}>
            <Button onClick={() => exportDossier(project)}>Export project dossier</Button>
            {project.stage === 'open' && (
              <Button variant="primary" onClick={startCalculation}>
                + New calculation
              </Button>
            )}
          </div>
        </div>
        <div className={styles.tabs}>
          <TabBar items={tabs} activeKey={tab} onSelect={(key) => setTab(key as Tab)} label="Project views" />
        </div>
      </header>
      <div className={tab === 'timeline' ? styles.timelineBody : styles.body}>
        {tab !== 'settings' && (
          <ProjectSidebar
            project={project}
            partId={partId}
            onPartChange={setPartId}
            onEditTargets={() => setTab('settings')}
          />
        )}
        {tab === 'timeline' && (
          <>
            <HistoryTimeline project={project} partId={partId} />
            <DecisionsPanel project={project} layout="column" />
          </>
        )}
        {tab === 'calculations' && (
          <div className={styles.pane}>
            <RevisionTable
              label="Calculations"
              rows={project.calculations
                .filter((c) => partId === null || c.partId === partId)
                .map((calculation) => ({
                  project,
                  calculation,
                  part: partOf(project, calculation.partId),
                  revision: currentRevision(calculation),
                }))}
              empty="No calculations saved for this part yet."
            />
          </div>
        )}
        {tab === 'decisions' && <DecisionsPanel project={project} layout="grid" />}
        {tab === 'reports' && (
          <div className={styles.pane}>
            <RevisionTable
              label="Revisions saved with a PDF report"
              rows={reports.filter((r) => partId === null || r.calculation.partId === partId)}
              empty="No revision was saved with “Attach PDF report”. Reopen a revision to print its report."
            />
          </div>
        )}
        {tab === 'settings' && <ProjectSettings project={project} />}
      </div>
    </AppLayout>
  )
}

/** "PASS · 2 IN REVIEW": the status plus what still needs attention. */
function statusText({ status, openIssues }: ReturnType<typeof projectStats>): string {
  const parts: string[] = [status]
  if (openIssues.fail > 0 && status !== 'fail') parts.push(`${openIssues.fail} failing`)
  if (openIssues.review > 0 && status !== 'review') parts.push(`${openIssues.review} in review`)
  return parts.join(' · ')
}
