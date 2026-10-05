// Summary of a project as listed on Home and in the projects table. Project
// storage will produce these; until then they come from fixtures.
import type { Tone } from '../ui'

export type ProjectStatus = 'pass' | 'review' | 'fail' | 'released' | 'open'

export interface ProjectSummary {
  /** Project code, e.g. "P-0142"; also the id in its URL. */
  id: string
  name: string
  /** Latest calculation, e.g. "Fit Tolerance · carrier pin Rev C". */
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
