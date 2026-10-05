// Shape of the data Home displays. Today it comes from home.fixtures.ts; later
// it will be derived from project storage and the materials database.
import type { ProjectSummary } from '../projects/projectSummary'

export type ToolSection = 'fit' | 'bolt' | 'lam' | 'mat'

export interface HomeData {
  /** Tool used most recently; its card is highlighted. */
  lastUsedTool: ToolSection | null
  /** Short summary of the last calculation per calculation tool. */
  lastCalculation: Partial<Record<Exclude<ToolSection, 'mat'>, string>>
  materials: { count: number; sources: string[] }
  recentProjects: ProjectSummary[]
}
