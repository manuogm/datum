// The running numbers Datum hands out: project codes (P-0143), calculation
// numbers per tool (FT-0413) and decision numbers per project (D-008).
import type { Project, Revision } from './model'
import type { ToolId } from './revision'
import { TOOLS } from './tools'

function pad(n: number, digits: number): string {
  return String(n).padStart(digits, '0')
}

/** Highest number found after `prefix-` in the given ids (0 when none). */
function highestNumber(ids: readonly string[], prefix: string): number {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`)
  return ids.reduce((max, id) => Math.max(max, Number(pattern.exec(id)?.[1] ?? 0)), 0)
}

export function nextProjectCode(projects: readonly Project[]): string {
  return `P-${pad(highestNumber(projects.map((p) => p.id), 'P') + 1, 4)}`
}

/** Calculation numbers run per tool across all projects, as in a team register. */
export function nextCalculationId(projects: readonly Project[], tool: ToolId): string {
  const ids = projects.flatMap((p) => p.calculations.map((c) => c.id))
  const { code } = TOOLS[tool]
  return `${code}-${pad(highestNumber(ids, code) + 1, 4)}`
}

export function nextDecisionId(project: Project): string {
  return `D-${pad(highestNumber(project.decisions.map((d) => d.id), 'D') + 1, 3)}`
}

export function revisionId(calculationId: string, rev: Revision['rev']): string {
  return `${calculationId}-${rev}`
}

/** A part key from its name: "Bearing carrier pin" → "bearing-carrier-pin". */
export function partIdFor(name: string, taken: readonly string[]): string {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'part'
  let id = base
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`
  return id
}
