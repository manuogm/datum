// Every change to projects, as pure functions: each takes the current state
// and returns the new one (or a plain-English reason why it cannot be done).
// Nothing here touches storage; the app's project store persists the result.
import { fail, ok, type Result } from '../result'
import { nextCalculationId, nextDecisionId, nextProjectCode, partIdFor, revisionId } from './identifiers'
import type {
  ActiveProject,
  Calculation,
  Decision,
  DesignTargets,
  Part,
  Person,
  Project,
  ProjectStage,
  ProjectsState,
  Revision,
  TeamMember,
} from './model'
import { findCalculation } from './queries'
import { revLetter } from './revLetters'
import type { ToolSnapshot } from './revision'

/** What the user fills in to create or edit a project. Parts without an id are new. */
export interface ProjectDraft {
  name: string
  program: string
  parts: { id?: string; name: string }[]
  targets: DesignTargets
  team: TeamMember[]
}

export interface SaveRevisionRequest {
  projectId: string
  /** An existing part, or the name of a part to add to the project. */
  part: { id: string } | { newName: string }
  snapshot: ToolSnapshot
  note: string
  reportAttached: boolean
  author: Person
  /** Also record a (proposed) design decision based on this revision. */
  decisionTitle?: string
}

function withProject(
  state: ProjectsState,
  projectId: string,
  change: (project: Project) => Result<Project>,
): Result<ProjectsState> {
  const project = state.projects.find((p) => p.id === projectId)
  if (!project) return fail(`There is no project ${projectId}.`)
  const changed = change(project)
  if (!changed.ok) return changed
  return ok({ ...state, projects: state.projects.map((p) => (p.id === projectId ? changed.value : p)) })
}

/** Turns the draft's part list into parts, keeping the ids of existing parts. */
function resolveParts(draft: ProjectDraft, existing: readonly Part[], used: ReadonlySet<string>): Result<Part[]> {
  const names = draft.parts.map((p) => p.name.trim()).filter(Boolean)
  const duplicate = names.find((name, i) => names.findIndex((n) => n.toLowerCase() === name.toLowerCase()) !== i)
  if (duplicate) return fail(`The part "${duplicate}" is listed twice.`)
  const dropped = existing.find((part) => used.has(part.id) && !draft.parts.some((p) => p.id === part.id))
  if (dropped) return fail(`"${dropped.name}" has saved calculations and cannot be removed.`)
  const parts: Part[] = []
  for (const draftPart of draft.parts) {
    const name = draftPart.name.trim()
    if (!name) continue
    const id = draftPart.id ?? partIdFor(name, [...existing.map((p) => p.id), ...parts.map((p) => p.id)])
    parts.push({ id, name })
  }
  return ok(parts)
}

function checkDraft(draft: ProjectDraft): Result<ProjectDraft> {
  if (!draft.name.trim()) return fail('Give the project a name.')
  const { serviceTempMinC, serviceTempMaxC } = draft.targets
  if (!(serviceTempMinC < serviceTempMaxC)) return fail('The service temperature range is empty: check min and max.')
  if (Object.values(draft.targets).some((value) => !Number.isFinite(value))) {
    return fail('Every design target needs a number.')
  }
  return ok(draft)
}

export function createProject(
  state: ProjectsState,
  draft: ProjectDraft,
  now: string,
): Result<{ state: ProjectsState; project: Project }> {
  const checked = checkDraft(draft)
  if (!checked.ok) return checked
  const parts = resolveParts(draft, [], new Set())
  if (!parts.ok) return parts
  const project: Project = {
    id: nextProjectCode(state.projects),
    name: draft.name.trim(),
    program: draft.program.trim(),
    stage: 'open',
    createdAt: now,
    parts: parts.value,
    targets: draft.targets,
    team: draft.team,
    calculations: [],
    decisions: [],
  }
  return ok({ state: { ...state, projects: [project, ...state.projects] }, project })
}

export function updateProject(state: ProjectsState, projectId: string, draft: ProjectDraft): Result<ProjectsState> {
  return withProject(state, projectId, (project) => {
    const checked = checkDraft(draft)
    if (!checked.ok) return checked
    const used = new Set(project.calculations.map((c) => c.partId))
    const parts = resolveParts(draft, project.parts, used)
    if (!parts.ok) return parts
    return ok({
      ...project,
      name: draft.name.trim(),
      program: draft.program.trim(),
      parts: parts.value,
      targets: draft.targets,
      team: draft.team,
    })
  })
}

export function setProjectStage(state: ProjectsState, projectId: string, stage: ProjectStage): Result<ProjectsState> {
  return withProject(state, projectId, (project) => ok({ ...project, stage }))
}

/**
 * Saves the snapshot as the next revision of the part's calculation for that
 * tool (starting a new calculation at Rev A when there is none), optionally
 * records a proposed decision, and makes the project and part active.
 */
export function saveRevision(
  state: ProjectsState,
  request: SaveRevisionRequest,
  now: string,
): Result<{ state: ProjectsState; revisionId: string; decisionId?: string }> {
  const project = state.projects.find((p) => p.id === request.projectId)
  if (!project) return fail(`There is no project ${request.projectId}.`)
  if (project.stage === 'released') return fail(`${project.name} is released. Reopen it to save new revisions.`)

  let parts = project.parts
  let partId: string
  if ('id' in request.part) {
    partId = request.part.id
    if (!parts.some((p) => p.id === partId)) return fail(`${project.name} has no part "${partId}".`)
  } else {
    const name = request.part.newName.trim()
    if (!name) return fail('Name the new part.')
    if (parts.some((p) => p.name.toLowerCase() === name.toLowerCase())) return fail(`The part "${name}" already exists.`)
    partId = partIdFor(name, parts.map((p) => p.id))
    parts = [...parts, { id: partId, name }]
  }

  const tool = request.snapshot.tool
  const existing = findCalculation(project, partId, tool)
  const calculation: Calculation = existing ?? {
    id: nextCalculationId(state.projects, tool),
    partId,
    tool,
    revisions: [],
  }
  const rev = revLetter(calculation.revisions.length)
  const revision: Revision = {
    id: revisionId(calculation.id, rev),
    rev,
    savedAt: now,
    author: request.author,
    note: request.note.trim(),
    reportAttached: request.reportAttached,
    snapshot: request.snapshot,
  }
  const saved = { ...calculation, revisions: [...calculation.revisions, revision] }
  const calculations = existing
    ? project.calculations.map((c) => (c.id === saved.id ? saved : c))
    : [...project.calculations, saved]

  const decisionTitle = request.decisionTitle?.trim()
  const decision: Decision | undefined = decisionTitle
    ? {
        id: nextDecisionId(project),
        title: decisionTitle,
        rationale: revision.note,
        status: 'proposed',
        proposedBy: request.author,
        recordedAt: now,
        basis: { calculationId: saved.id, rev },
      }
    : undefined

  const updated: Project = {
    ...project,
    parts,
    calculations,
    decisions: decision ? [...project.decisions, decision] : project.decisions,
  }
  return ok({
    state: {
      projects: state.projects.map((p) => (p.id === project.id ? updated : p)),
      active: { projectId: project.id, partId },
    },
    revisionId: revision.id,
    decisionId: decision?.id,
  })
}

export interface DecisionDraft {
  title: string
  rationale: string
  basis?: Decision['basis']
  proposedBy: Person
}

export function recordDecision(
  state: ProjectsState,
  projectId: string,
  draft: DecisionDraft,
  now: string,
): Result<ProjectsState> {
  return withProject(state, projectId, (project) => {
    const title = draft.title.trim()
    if (!title) return fail('Give the decision a title.')
    const decision: Decision = {
      id: nextDecisionId(project),
      title,
      rationale: draft.rationale.trim(),
      status: 'proposed',
      proposedBy: draft.proposedBy,
      recordedAt: now,
      basis: draft.basis,
    }
    return ok({ ...project, decisions: [...project.decisions, decision] })
  })
}

export function approveDecision(
  state: ProjectsState,
  projectId: string,
  decisionId: string,
  approver: Person,
  now: string,
): Result<ProjectsState> {
  return withProject(state, projectId, (project) => {
    if (!project.decisions.some((d) => d.id === decisionId)) return fail(`There is no decision ${decisionId}.`)
    const decisions = project.decisions.map((d) =>
      d.id === decisionId ? { ...d, status: 'approved' as const, approvedBy: approver, approvedAt: now } : d,
    )
    return ok({ ...project, decisions })
  })
}

/** Chooses the project (and part) new calculations belong to; null clears it. */
export function setActiveProject(state: ProjectsState, active: ActiveProject | null): Result<ProjectsState> {
  if (active && !state.projects.some((p) => p.id === active.projectId)) {
    return fail(`There is no project ${active.projectId}.`)
  }
  return ok({ ...state, active })
}
