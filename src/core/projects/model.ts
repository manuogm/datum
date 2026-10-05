// The project data model: what Datum remembers about a project, its parts,
// the saved revisions of each calculation and the design decisions taken.
import type { ToolId, ToolSnapshot } from './revision'

/** Someone named in a project. There are no accounts: initials and a display name. */
export interface Person {
  initials: string
  name: string
}

export interface TeamMember extends Person {
  /** Free text such as "Owner", "Approver" or "Stress"; "Approver" signs off decisions. */
  role: string
}

/** Project-wide requirements that every tool starts from. */
export interface DesignTargets {
  serviceTempMinC: number
  serviceTempMaxC: number
  /** Minimum safety factor for metallic parts. */
  minSafetyFactorMetallic: number
  /** Minimum reserve factor for composite parts. */
  minReserveFactorComposite: number
  /** Minimum slip safety S_G of bolted joints (VDI 2230). */
  minSlipSafety: number
}

export interface Part {
  /** Stable key within the project, derived from the first name it was given. */
  id: string
  name: string
}

/** One saved state of a calculation: Rev A, Rev B, … */
export interface Revision {
  /** Unique within the project, e.g. "FT-0412-C". */
  id: string
  /** Revision letter, e.g. "C" (see revLetters.ts). */
  rev: string
  /** ISO 8601 timestamp. */
  savedAt: string
  author: Person
  /** Why this revision was made; shown in quotes in the history. */
  note: string
  /** The user asked for the PDF report to go with this revision. */
  reportAttached: boolean
  snapshot: ToolSnapshot
}

/**
 * The revisions of one tool's calculation for one part, e.g. the fit of the
 * bearing carrier pin. A part has at most one calculation per tool.
 */
export interface Calculation {
  /** Tool code and running number, e.g. "FT-0412". */
  id: string
  partId: string
  tool: ToolId
  /** Oldest first; the last one is the current revision. */
  revisions: Revision[]
}

export type DecisionStatus = 'proposed' | 'approved'

export interface Decision {
  /** "D-" and a running number within the project, e.g. "D-007". */
  id: string
  title: string
  /** The reasoning behind the decision. */
  rationale: string
  status: DecisionStatus
  proposedBy: Person
  /** ISO 8601 timestamp of when it was recorded. */
  recordedAt: string
  approvedBy?: Person
  approvedAt?: string
  /** The calculation revision the decision rests on, if any. */
  basis?: { calculationId: string; rev: string }
}

/** Open while work goes on; released once the design is frozen. */
export type ProjectStage = 'open' | 'released'

export interface Project {
  /** The project code, e.g. "P-0142". Never changes; also used in URLs. */
  id: string
  name: string
  /** Vehicle or product programme, e.g. "FW-27". */
  program: string
  stage: ProjectStage
  createdAt: string
  parts: Part[]
  targets: DesignTargets
  team: TeamMember[]
  calculations: Calculation[]
  /** Oldest first. */
  decisions: Decision[]
}

/** The project (and part) new calculations belong to; shown in the header chip. */
export interface ActiveProject {
  projectId: string
  partId?: string
}

/** Everything the projects store keeps. */
export interface ProjectsState {
  projects: Project[]
  active: ActiveProject | null
}
