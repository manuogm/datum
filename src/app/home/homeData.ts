// What Home displays, derived from the stored projects and the materials
// database: the most recently used tool, the last calculation per tool and
// the three most recently active projects.
import { revisionsNewestFirst, type Project } from '../../core/projects'
import type { Material } from '../../core/materials'
import { summarizeProject, type ProjectSummary } from '../projects/projectSummary'

export type ToolSection = 'fit' | 'bolt' | 'lam' | 'mat'

export interface HomeData {
  /** Tool used most recently; its card is highlighted. */
  lastUsedTool: ToolSection | null
  /** Short summary of the last calculation per calculation tool. */
  lastCalculation: Partial<Record<Exclude<ToolSection, 'mat'>, string>>
  materials: { count: number; sources: string[] }
  recentProjects: ProjectSummary[]
}

/** Standards bodies named on the Materials card, when a material spec cites them. */
const STANDARDS_BODIES = ['EN', 'ISO', 'AMS', 'ASTM']

const RECENT_PROJECTS = 3

export function buildHomeData(projects: readonly Project[], materials: readonly Material[]): HomeData {
  const revisions = projects
    .flatMap(revisionsNewestFirst)
    .sort((a, b) => b.revision.savedAt.localeCompare(a.revision.savedAt))
  const lastCalculation: HomeData['lastCalculation'] = {}
  for (const tool of ['fit', 'bolt', 'lam'] as const) {
    const latest = revisions.find((r) => r.calculation.tool === tool)
    if (latest) lastCalculation[tool] = latest.revision.snapshot.title
  }
  const specs = materials.map((m) => m.spec.split(' ')[0])
  return {
    lastUsedTool: revisions[0]?.calculation.tool ?? null,
    lastCalculation,
    materials: { count: materials.length, sources: STANDARDS_BODIES.filter((body) => specs.includes(body)) },
    recentProjects: projects
      .map(summarizeProject)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, RECENT_PROJECTS),
  }
}
