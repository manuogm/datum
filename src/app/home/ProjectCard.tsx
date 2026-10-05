// ProjectCard: a recent project on Home with its latest calculation, status
// and activity counts; links to the project page.
import styles from './ProjectCard.module.css'
import { formatActivityTime } from '../format/formatActivityTime'
import { PROJECT_STATUS_TONE, type ProjectSummary } from '../projects/projectSummary'
import { routeHref } from '../router/routes'
import { Badge, Card, cx, Marker, MonoLabel } from '../ui'
import { countOf } from '../format/count'

interface ProjectCardProps {
  project: ProjectSummary
  now?: Date
}

export function ProjectCard({ project, now }: ProjectCardProps) {
  return (
    <Card href={routeHref({ name: 'project', id: project.id })}>
      <div className={styles.row}>
        <Marker shape="diamond" />
        <span className={styles.name}>{project.name}</span>
        <span className={styles.code}>{project.id}</span>
      </div>
      <div className={cx(styles.row, styles.last)}>
        <MonoLabel className={styles.lastLabel}>Last</MonoLabel>
        <span className={styles.lastText}>{project.lastCalculation}</span>
        <Badge tone={PROJECT_STATUS_TONE[project.status]}>{project.status}</Badge>
      </div>
      <div className={styles.stats}>
        <span>{countOf(project.calculationCount, 'calc')}</span>
        <span>{countOf(project.decisionCount, 'decision')}</span>
        <span className={styles.when}>{formatActivityTime(new Date(project.updatedAt), now)}</span>
      </div>
    </Card>
  )
}
