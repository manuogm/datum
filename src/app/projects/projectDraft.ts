// Starting points for the project form: a blank draft for a new project
// (the owner and default targets filled in) or the draft of an existing one.
import type { DesignTargets, Person, Project, ProjectDraft } from '../../core/projects'

/** Targets a new project starts from; the user adjusts them in the drawer. */
const DEFAULT_TARGETS: DesignTargets = {
  serviceTempMinC: -20,
  serviceTempMaxC: 120,
  minSafetyFactorMetallic: 1.5,
  minReserveFactorComposite: 1.5,
  minSlipSafety: 1.8,
}

export function emptyDraft(owner: Person, program = ''): ProjectDraft {
  return { name: '', program, parts: [], targets: DEFAULT_TARGETS, team: [{ ...owner, role: 'Owner' }] }
}

export function draftFromProject(project: Project): ProjectDraft {
  return {
    name: project.name,
    program: project.program,
    parts: project.parts.map(({ id, name }) => ({ id, name })),
    targets: project.targets,
    team: project.team,
  }
}

/** "Jane Okafor" or "J. Okafor" → "JO"; one word → its first two letters. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/[\s.]+/).filter(Boolean)
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? '').slice(0, 2)
  return letters.toUpperCase()
}

/** Programmes already in use, offered as suggestions in the project form. */
export function programsOf(projects: readonly Project[]): string[] {
  return [...new Set(projects.map((p) => p.program).filter(Boolean))]
}
