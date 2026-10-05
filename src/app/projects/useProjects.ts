// useProjects: the projects state for screens, plus the actions that change
// it. Each action stamps the time and the current user, and returns either
// the outcome or a plain-English error to show next to the form.
import { useMemo, useSyncExternalStore } from 'react'
import {
  approveDecision,
  approverOf,
  createProject,
  recordDecision,
  saveRevision,
  setActiveProject,
  setProjectStage,
  updateProject,
  type ActiveProject,
  type DecisionDraft,
  type Project,
  type ProjectDraft,
  type ProjectStage,
  type SaveRevisionRequest,
} from '../../core/projects'
import { ok, type Result } from '../../core/result'
import { localTimestamp } from '../format/timestamp'
import { CURRENT_USER } from '../user.fixtures'
import { applyChange, getSnapshot, replaceState, subscribe } from './projectStore'

type Done = Result<null>

function done(result: Result<unknown>): Done {
  return result.ok ? ok(null) : result
}

const actions = {
  /** Creates the project and makes it the active one. */
  createProject(draft: ProjectDraft): Result<Project> {
    const outcome = createProject(getSnapshot().state, draft, localTimestamp())
    if (!outcome.ok) return outcome
    const { state, project } = outcome.value
    replaceState({ ...state, active: { projectId: project.id } })
    return ok(project)
  },

  updateProject(projectId: string, draft: ProjectDraft): Done {
    return done(applyChange((state) => updateProject(state, projectId, draft)))
  },

  setStage(projectId: string, stage: ProjectStage): Done {
    return done(applyChange((state) => setProjectStage(state, projectId, stage)))
  },

  /** Saves a tool snapshot as the next revision; returns the new revision's id. */
  saveRevision(request: Omit<SaveRevisionRequest, 'author'>): Result<string> {
    const outcome = saveRevision(getSnapshot().state, { ...request, author: CURRENT_USER }, localTimestamp())
    if (!outcome.ok) return outcome
    replaceState(outcome.value.state)
    return ok(outcome.value.revisionId)
  },

  recordDecision(projectId: string, draft: Omit<DecisionDraft, 'proposedBy'>): Done {
    return done(
      applyChange((state) => recordDecision(state, projectId, { ...draft, proposedBy: CURRENT_USER }, localTimestamp())),
    )
  },

  /** Marks a decision approved by the project's approver (or the current user when none is named). */
  approveDecision(project: Project, decisionId: string): Done {
    const approver = approverOf(project) ?? CURRENT_USER
    return done(
      applyChange((state) => approveDecision(state, project.id, decisionId, approver, localTimestamp())),
    )
  },

  setActive(active: ActiveProject | null): Done {
    return done(applyChange((state) => setActiveProject(state, active)))
  },
}

export function useProjects() {
  const { state, problem } = useSyncExternalStore(subscribe, getSnapshot)
  return useMemo(() => {
    const activeProject = state.active ? state.projects.find((p) => p.id === state.active?.projectId) : undefined
    return { projects: state.projects, active: state.active, activeProject, problem, actions }
  }, [state, problem])
}
