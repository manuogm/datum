// Summary of a project as listed on Home: name, status, the latest
// calculation and activity counts, derived from the stored project.
import { projectStats, TOOLS, type Project, type ProjectStatus } from '../../core/projects'
import type { Tone } from '../ui'

export interface ProjectSummary {
  /** Project code, e.g. "P-0142"; also the id in its URL. */
  id: string
  name: string
  /** Latest calculation, e.g. "Fit Tolerance · Bearing carrier pin Rev C". */
  lastCalculation: string
  status: ProjectStatus
  calculationCount: number
  decisionCount: number
  /** ISO 8601 timestamp of the last activity. */
  updatedAt: string
}

export const PROJECT_STATUS_TONE: Record<ProjectStatus, Tone> = {
  pass: 'ok',
  review: 'warn',
  fail: 'bad',
  released: 'neutral',
  open: 'hole',
}

export function summarizeProject(project: Project): ProjectSummary {
  const stats = projectStats(project)
  const latest = stats.latest
  return {
    id: project.id,
    name: project.name,
    lastCalculation: latest
      ? `${TOOLS[latest.calculation.tool].name} · ${latest.part.name} Rev ${latest.revision.rev}`
      : 'No calculations yet',
    status: stats.status,
    calculationCount: stats.calculationCount,
    decisionCount: stats.decisionCount,
    updatedAt: stats.lastActivity,
  }
}
