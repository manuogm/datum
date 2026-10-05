// Read-only questions asked of projects: status, counts, history, the
// changes between revisions and where a material is used.
import type { Calculation, Decision, Part, Project, Revision, TeamMember } from './model'
import type { SnapshotFigure, ToolId } from './revision'
import { TOOL_IDS } from './tools'

/**
 * Status of a project as listed: released once frozen, open while it has no
 * calculations, otherwise the verdict of its most recent revision (as the
 * designs show it). openIssues counts what still needs attention.
 */
export type ProjectStatus = 'pass' | 'review' | 'fail' | 'released' | 'open'

/** A revision with the calculation and part it belongs to. */
export interface RevisionInContext {
  project: Project
  calculation: Calculation
  part: Part
  revision: Revision
}

export interface ProjectStats {
  status: ProjectStatus
  /** Current calculations whose verdict is review or fail. */
  openIssues: { review: number; fail: number }
  calculationsByTool: Record<ToolId, number>
  calculationCount: number
  decisionCount: number
  /** ISO timestamp of the latest saved revision or decision (creation date when none). */
  lastActivity: string
  latest: RevisionInContext | null
}

export function currentRevision(calculation: Calculation): Revision {
  return calculation.revisions[calculation.revisions.length - 1]
}

export function findCalculation(project: Project, partId: string, tool: ToolId): Calculation | undefined {
  return project.calculations.find((c) => c.partId === partId && c.tool === tool)
}

export function partOf(project: Project, partId: string): Part {
  return project.parts.find((p) => p.id === partId) ?? { id: partId, name: partId }
}

/** The team member who signs off decisions, if the project names one. */
export function approverOf(project: Project): TeamMember | undefined {
  return project.team.find((m) => m.role.toLowerCase() === 'approver')
}

/** Every revision of the project, newest first. */
export function revisionsNewestFirst(project: Project): RevisionInContext[] {
  return project.calculations
    .flatMap((calculation) =>
      calculation.revisions.map((revision) => ({
        project,
        calculation,
        part: partOf(project, calculation.partId),
        revision,
      })),
    )
    .sort((a, b) => b.revision.savedAt.localeCompare(a.revision.savedAt))
}

export function projectStats(project: Project): ProjectStats {
  const current = project.calculations.map(currentRevision)
  const openIssues = {
    review: current.filter((r) => r.snapshot.status === 'review').length,
    fail: current.filter((r) => r.snapshot.status === 'fail').length,
  }
  const calculationsByTool = Object.fromEntries(
    TOOL_IDS.map((tool) => [tool, project.calculations.filter((c) => c.tool === tool).length]),
  ) as Record<ToolId, number>
  const latest = revisionsNewestFirst(project)[0] ?? null
  const activity = [
    project.createdAt,
    latest?.revision.savedAt ?? '',
    ...project.decisions.flatMap((d) => [d.recordedAt, d.approvedAt ?? '']),
  ]
  return {
    status: project.stage === 'released' ? 'released' : latest ? latest.revision.snapshot.status : 'open',
    openIssues,
    calculationsByTool,
    calculationCount: project.calculations.length,
    decisionCount: project.decisions.length,
    lastActivity: activity.reduce((a, b) => (b > a ? b : a)),
    latest,
  }
}

/** A revision is superseded once a later revision of the same calculation exists. */
export function isSuperseded(calculation: Calculation, revision: Revision): boolean {
  return currentRevision(calculation).id !== revision.id
}

/** The revision saved just before this one in the same calculation. */
export function previousRevision(calculation: Calculation, revision: Revision): Revision | undefined {
  const index = calculation.revisions.findIndex((r) => r.id === revision.id)
  return index > 0 ? calculation.revisions[index - 1] : undefined
}

/** Decisions that rest on the given revision. */
export function decisionsBasedOn(project: Project, calculation: Calculation, revision: Revision): Decision[] {
  return project.decisions.filter(
    (d) => d.basis?.calculationId === calculation.id && d.basis.rev === revision.rev,
  )
}

/** "2…36 µm": a figure's value with its unit. */
export function figureText(figure: SnapshotFigure): string {
  return figure.unit ? `${figure.value} ${figure.unit}` : figure.value
}

/** One headline figure that differs between two revisions; before/after is absent when the figure is new or gone. */
export interface FigureChange {
  label: string
  before?: string
  after?: string
}

/** Figures that changed from one revision to the next, paired by label, in the newer revision's order. */
export function figureChanges(before: readonly SnapshotFigure[], after: readonly SnapshotFigure[]): FigureChange[] {
  const old = new Map(before.map((f) => [f.label, figureText(f)]))
  const changed: FigureChange[] = after
    .map((f) => ({ label: f.label, before: old.get(f.label), after: figureText(f) }))
    .filter((c) => c.before !== c.after)
  const removed = before
    .filter((f) => !after.some((a) => a.label === f.label))
    .map((f) => ({ label: f.label, before: figureText(f) }))
  return [...changed, ...removed]
}

/** Looks up a revision by project code and revision id (as in a reopen link). */
export function findRevision(
  projects: readonly Project[],
  projectId: string,
  revisionId: string,
): RevisionInContext | null {
  const project = projects.find((p) => p.id === projectId)
  if (!project) return null
  for (const calculation of project.calculations) {
    const revision = calculation.revisions.find((r) => r.id === revisionId)
    if (revision) return { project, calculation, part: partOf(project, calculation.partId), revision }
  }
  return null
}

/** Current revisions, across all projects, whose calculation uses the material. */
export function materialUsage(projects: readonly Project[], materialId: string): RevisionInContext[] {
  return projects.flatMap((project) =>
    project.calculations
      .filter((calculation) => currentRevision(calculation).snapshot.materialIds?.includes(materialId))
      .map((calculation) => ({
        project,
        calculation,
        part: partOf(project, calculation.partId),
        revision: currentRevision(calculation),
      })),
  )
}
