// ProjectsTable: one row per project with programme, calculations per tool,
// decisions, last activity and status. The whole row opens the project.
import { TOOL_IDS, type Project, type ProjectStats, type ToolId } from '../../core/projects'
import { formatActivityTime } from '../format/formatActivityTime'
import { routeHref } from '../router/routes'
import { Badge, cx, Icon, Marker, type IconName } from '../ui'
import { PROJECT_STATUS_TONE } from './projectSummary'
import styles from './ProjectsTable.module.css'
import { countOf } from '../format/count'

const TOOL_ICONS: Record<ToolId, { icon: IconName; label: string }> = {
  fit: { icon: 'tool-fit', label: 'fit calculations' },
  bolt: { icon: 'tool-bolt', label: 'bolted joints' },
  lam: { icon: 'tool-lam', label: 'laminates' },
  mat: { icon: 'tool-mat', label: 'material selections' },
}

interface ProjectsTableProps {
  rows: readonly { project: Project; stats: ProjectStats }[]
  /** The project to highlight (the active one). */
  highlightId?: string
}

export function ProjectsTable({ rows, highlightId }: ProjectsTableProps) {
  return (
    <div className={styles.table} role="table" aria-label="Projects">
      <div className={cx(styles.row, styles.header)} role="row">
        <span role="columnheader">Project</span>
        <span role="columnheader" className={styles.wide}>Program</span>
        <span role="columnheader" className={styles.wide}>Calculations</span>
        <span role="columnheader" className={styles.wide}>Decisions</span>
        <span role="columnheader" className={styles.medium}>Last activity</span>
        <span role="columnheader">Status</span>
      </div>
      {rows.map(({ project, stats }) => {
        const highlighted = project.id === highlightId
        return (
          <div key={project.id} className={cx(styles.row, styles.body, highlighted && styles.highlighted)} role="row">
            <div className={styles.project} role="cell">
              <Marker shape="diamond" color={highlighted ? 'accent' : PROJECT_STATUS_TONE[stats.status]} />
              <div className={styles.names}>
                <a className={styles.name} href={routeHref({ name: 'project', id: project.id })}>
                  {project.name}
                </a>
                <span className={styles.meta}>
                  {project.id} · {countOf(project.parts.length, 'part')}
                </span>
              </div>
            </div>
            <span role="cell" className={cx(styles.program, styles.wide)}>
              {project.program}
            </span>
            <span role="cell" className={cx(styles.tools, styles.wide)}>
              {TOOL_IDS.map((tool) => (
                <span key={tool} className={styles.tool} title={`${stats.calculationsByTool[tool]} ${TOOL_ICONS[tool].label}`}>
                  <Icon name={TOOL_ICONS[tool].icon} size={12} />
                  {stats.calculationsByTool[tool]}
                </span>
              ))}
            </span>
            <span role="cell" className={cx(styles.decisions, styles.wide)}>
              {stats.decisionCount}
            </span>
            <span role="cell" className={cx(styles.when, styles.medium)}>
              {formatActivityTime(new Date(stats.lastActivity))}
            </span>
            <span role="cell">
              <Badge tone={PROJECT_STATUS_TONE[stats.status]} size="md">
                {stats.status}
              </Badge>
            </span>
          </div>
        )
      })}
    </div>
  )
}
