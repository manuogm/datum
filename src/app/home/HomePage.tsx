// Home ("Home v2" design): hero with search, the four tools as flush
// columns, and recent projects, all derived from the stored projects.
import { useMemo } from 'react'
import styles from './HomePage.module.css'
import { MATERIALS } from '../../core/materials'
import { AppLayout } from '../AppLayout'
import { NEW_PROJECT_HREF } from '../projects/newProjectLink'
import { useProjects } from '../projects/useProjects'
import { routeHref } from '../router/routes'
import { Button, MonoLabel, SearchField } from '../ui'
import { buildHomeData } from './homeData'
import { ProjectCard } from './ProjectCard'
import { ToolCard } from './ToolCard'
import { toolCards } from './toolCards'

const REQUEST_TOOL_URL = 'https://github.com/manuogm/datum/issues/new'

export function HomePage() {
  const { projects } = useProjects()
  const data = useMemo(() => buildHomeData(projects, MATERIALS), [projects])
  return (
    <AppLayout section="home" background="page">
      <div className={styles.page}>
        <section className={styles.hero}>
          <h1 className={styles.title}>
            Engineering <span className={styles.titleAccent}>tools</span>
          </h1>
          <div className={styles.intro}>
            <p className={styles.lead}>
              Live diagrams in place of spreadsheet cells. Every number traces back to its formula and standard,
              and every result can be saved to a project.
            </p>
            <SearchField label="Search" placeholder="Search tools, projects, materials" shortcut="⌘K" />
          </div>
        </section>

        <section className={styles.tools} aria-label="Tools">
          {toolCards(data).map((card) => (
            <ToolCard key={card.tool} content={card} featured={card.tool === data.lastUsedTool} />
          ))}
          <div className={styles.more}>
            <MonoLabel size="md" tone="faint">
              05 —
            </MonoLabel>
            <h2 className={styles.moreTitle}>More tools coming</h2>
            <a className={styles.request} href={REQUEST_TOOL_URL} target="_blank" rel="noreferrer">
              Request →
            </a>
          </div>
        </section>

        <section className={styles.recent} aria-labelledby="recent-projects">
          <div className={styles.recentHead}>
            <MonoLabel as="h2" size="md" id="recent-projects">
              Recent projects
            </MonoLabel>
            <a className={styles.allProjects} href={routeHref({ name: 'projects' })}>
              All projects →
            </a>
            <Button size="sm" href={NEW_PROJECT_HREF}>
              + New project
            </Button>
          </div>
          <div className={styles.projects}>
            {data.recentProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
