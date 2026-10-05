// The header chip on tool screens: the active project, its active part and
// that part's current revision in this tool (e.g. FW-27 Rear upright /
// Bearing carrier pin · REV C).
import { currentRevision, findCalculation, partOf, type ToolId } from '../../core/projects'
import type { Section } from '../router/routes'
import type { ProjectContext } from '../ui'
import { useProjects } from './useProjects'

const TOOL_SECTIONS: readonly string[] = ['fit', 'bolt', 'lam'] satisfies ToolId[]

/** The chip for a screen, or undefined when the screen is not a tool or no project is active. */
export function useActiveProjectChip(section: Section | null): (ProjectContext & { projectId: string }) | undefined {
  const { active, activeProject } = useProjects()
  if (!section || !TOOL_SECTIONS.includes(section) || !activeProject) return undefined
  const partId = active?.partId
  const calculation = partId ? findCalculation(activeProject, partId, section as ToolId) : undefined
  return {
    projectId: activeProject.id,
    name: activeProject.name,
    part: partId ? partOf(activeProject, partId).name : undefined,
    rev: calculation ? currentRevision(calculation).rev : undefined,
  }
}
