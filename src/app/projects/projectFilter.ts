// The status tabs and the text filter of the Projects list.
import type { Project, ProjectStats } from '../../core/projects'

export type ProjectView = 'all' | 'open' | 'review' | 'released'

export const PROJECT_VIEWS: readonly { value: ProjectView; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'review', label: 'In review' },
  { value: 'released', label: 'Released' },
]

/** Open = not released; In review = its latest revision awaits review; Released = frozen. */
function inView(project: Project, stats: ProjectStats, view: ProjectView): boolean {
  switch (view) {
    case 'all':
      return true
    case 'open':
      return project.stage === 'open'
    case 'review':
      return stats.status === 'review'
    case 'released':
      return project.stage === 'released'
  }
}

/** Matches name, code, programme or part names, ignoring case. */
function matches(project: Project, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  const haystack = [project.name, project.id, project.program, ...project.parts.map((p) => p.name)]
  return haystack.some((text) => text.toLowerCase().includes(needle))
}

export function filterProjects<T extends { project: Project; stats: ProjectStats }>(
  rows: readonly T[],
  view: ProjectView,
  query: string,
): T[] {
  return rows.filter(({ project, stats }) => inView(project, stats, view) && matches(project, query))
}
