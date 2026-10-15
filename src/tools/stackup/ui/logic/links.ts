// Assembly mode: the saved Part stacks an assembly links, as they stand in
// the library now. An assembly uses a part's saved result (never its unsaved
// edits); when the link is broken it falls back on the values it was last
// saved with (LinkedRow.last):
//
//   linked      found, a Part stack, its chain runs, saved when the assembly last saw it
//   updated     the same, but the part was saved again since: its new values are used
//   missing     the calculation was deleted
//   not-a-part  it was switched to Assembly mode (or is not a stack-up)
//   part-fails  its own chain is rejected by the engine
//
// A broken link (the last three) caps the verdict at review (verdict.ts).
import { findCalculation, folderPath, type Calculation, type CalculationStatus, type Library } from '../../../../core/library'
import type { UnitSystem } from '../../../../core/units'
import { analyseStack, type StackAnalysis, type StackResult } from '../../calc'
import { stackInputsFrom } from '../state/readInputs'
import type { LinkSnapshot, LinkedRow, StackInputs } from '../state/stackInputs'
import { engineInput } from './engineInput'
import { deviations, len } from './format'

export type LinkState = 'linked' | 'updated' | 'missing' | 'not-a-part' | 'part-fails'

export interface ResolvedLink {
  readonly row: LinkedRow
  readonly state: LinkState
  /** The part stack values the assembly uses: the part's saved result, or the last known one when the link is broken. */
  readonly stack: StackResult
  readonly partName: string
  readonly resultName: string
  readonly calculationName: string
  readonly folderName: string
  /** When the part was saved (last known, when it is gone). */
  readonly updatedAt: string
  /** The part's own stack (its saved inputs), for the drill-down into its rows; null when the link is broken. */
  readonly part: StackAnalysis | null
  /** The part's saved inputs (its rows, for their icons and names); null when the link is broken. */
  readonly partInputs: StackInputs | null
  /** The part's own verdict; null when the link is broken. */
  readonly partStatus: CalculationStatus | null
  /** The part is open with unsaved edits (they are not used until it is saved). */
  readonly unsavedEdits: boolean
}

export const isBroken = (state: LinkState): boolean => state === 'missing' || state === 'not-a-part' || state === 'part-fails'

/** "Examples", "Rear upright / Spacers", or "Home" at the top level. */
export function folderName(library: Library, folderId: string | null): string {
  return folderPath(library, folderId).map((f) => f.name).join(' / ') || 'Home'
}

/** A verdict as a library status: 'none' without a requirement. */
export const statusOf = (analysis: StackAnalysis): CalculationStatus => analysis.verdict?.status ?? 'none'

/** A saved Part stack of the library, worked out from its saved inputs. */
export interface PartStack {
  readonly calculation: Calculation
  readonly inputs: StackInputs
  readonly folderName: string
  /** Its analysis, or the engine's explanation of why its chain fails. */
  readonly analysis: ReturnType<typeof analyseStack>
}

/** A stack-up calculation of the library read as a Part stack, or null when it is not one (another tool, or Assembly mode). */
export function partStackOf(library: Library, calculation: Calculation): PartStack | null {
  if (calculation.tool !== 'stack') return null
  const inputs = stackInputsFrom(calculation.inputs)
  if (inputs.mode !== 'part') return null
  return { calculation, inputs, folderName: folderName(library, calculation.folderId), analysis: analyseStack(engineInput(inputs, new Map())) }
}

/** Every Part stack of the library, from every folder: what the link picker lists. */
export function partStacks(library: Library): PartStack[] {
  return library.calculations.flatMap((c) => partStackOf(library, c) ?? [])
}

/** One linked row as it stands in the library now. `hasDraft` says which calculations have unsaved edits. */
export function resolveLink(row: LinkedRow, library: Library, hasDraft: (id: string) => boolean = () => false): ResolvedLink {
  const calculation = findCalculation(library, row.calcId)
  const lastKnown = (state: LinkState): ResolvedLink => ({
    row, state, stack: row.last.stack, partName: row.last.partName, resultName: row.last.resultName,
    calculationName: calculation?.name ?? row.last.calculationName,
    folderName: calculation ? folderName(library, calculation.folderId) : row.last.folderName,
    updatedAt: calculation?.updatedAt ?? row.last.updatedAt,
    part: null, partInputs: null, partStatus: null, unsavedEdits: calculation !== undefined && hasDraft(calculation.id),
  })
  if (!calculation) return lastKnown('missing')
  const part = partStackOf(library, calculation)
  if (!part) return lastKnown('not-a-part')
  if (!part.analysis.ok) return lastKnown('part-fails')
  const analysis = part.analysis.value
  return {
    row,
    state: calculation.updatedAt === row.last.updatedAt ? 'linked' : 'updated',
    stack: analysis.stackResult,
    partName: part.inputs.partName.trim() || calculation.name,
    resultName: part.inputs.resultName.trim() || 'Result',
    calculationName: calculation.name,
    folderName: part.folderName,
    updatedAt: calculation.updatedAt,
    part: analysis,
    partInputs: part.inputs,
    partStatus: statusOf(analysis),
    unsavedEdits: hasDraft(calculation.id),
  }
}

/** Each linked row of the inputs, resolved, by row id. */
export function resolveLinks(inputs: StackInputs, library: Library, hasDraft?: (id: string) => boolean): ReadonlyMap<string, ResolvedLink> {
  return new Map(inputs.rows.flatMap((row) => (row.kind === 'linked' ? [[row.id, resolveLink(row, library, hasDraft)] as const] : [])))
}

/**
 * A part stack result as an assembly records it: each number to 12
 * significant digits, so floating-point noise (0.1700000000000017) is not
 * stored and does not count as a change of the part.
 */
export function recordedStack(stack: StackResult): StackResult {
  const round = (value: number) => Number(value.toPrecision(12))
  return {
    name: stack.name,
    nominal: round(stack.nominal),
    mean: round(stack.mean),
    upperDeviation: round(stack.upperDeviation),
    lowerDeviation: round(stack.lowerDeviation),
    sigma: round(stack.sigma),
  }
}

/** What an assembly records of a linked part stack when it is saved. */
export function snapshotOf(link: Omit<ResolvedLink, 'row' | 'state'>): LinkSnapshot {
  const { stack, partName, resultName, calculationName, folderName: folder, updatedAt } = link
  return { stack: recordedStack(stack), partName, resultName, calculationName, folderName: folder, updatedAt }
}

/**
 * The inputs as Save writes them: each link that resolves records the part
 * values it now uses, so "updated" clears and a later broken link falls back
 * on them. The same object when nothing changes.
 */
export function withLinkSnapshots(inputs: StackInputs, links: ReadonlyMap<string, ResolvedLink>): StackInputs {
  let changed = false
  const rows = inputs.rows.map((row) => {
    const link = row.kind === 'linked' ? links.get(row.id) : undefined
    if (row.kind !== 'linked' || !link || isBroken(link.state)) return row
    const last = snapshotOf(link)
    if (JSON.stringify(last) === JSON.stringify(row.last)) return row
    changed = true
    return { ...row, last }
  })
  return changed ? { ...inputs, rows } : inputs
}

/**
 * The inputs once linked part stacks were saved or deleted (the library
 * before → after the change): each link that breaks with this change (the
 * part deleted, switched to Assembly, or saved with a chain that fails)
 * records the part's last saved result, as it stood before the change. A
 * broken link falls back on that, so the assembly keeps the part's last
 * saved values, as the delete dialog says, not the older values the
 * assembly itself was last saved with (mechanical review S2).
 *
 * A link that still resolves is left as it is: it uses the part's saved
 * result anyway, and its snapshot stays what the assembly was saved with,
 * so the row can still say what changed (UPDATED, design §6.3). The same
 * object when nothing changes.
 */
export function withPartsLastSaved(inputs: StackInputs, before: Library, after: Library): StackInputs {
  let changed = false
  const rows = inputs.rows.map((row) => {
    if (row.kind !== 'linked' || !isBroken(resolveLink(row, after).state)) return row
    const previous = resolveLink(row, before)
    if (isBroken(previous.state)) return row
    const last = snapshotOf(previous)
    if (JSON.stringify(last) === JSON.stringify(row.last)) return row
    changed = true
    return { ...row, last }
  })
  return changed ? { ...inputs, rows } : inputs
}

/**
 * Inputs with unsaved edits, given stored inputs in which the app has since
 * recorded a part's last saved values (withPartsLastSaved): a linked row
 * still linking the same part takes the recorded snapshot; every edit stays.
 */
export function rebaseLinks(edited: StackInputs, stored: StackInputs): StackInputs {
  const recorded = new Map(stored.rows.flatMap((row) => (row.kind === 'linked' ? [[row.id, row] as const] : [])))
  let changed = false
  const rows = edited.rows.map((row) => {
    const saved = row.kind === 'linked' ? recorded.get(row.id) : undefined
    if (row.kind !== 'linked' || !saved || saved.calcId !== row.calcId || JSON.stringify(saved.last) === JSON.stringify(row.last)) return row
    changed = true
    return { ...row, last: saved.last }
  })
  return changed ? { ...edited, rows } : edited
}

/** The badge of a link state (design §6.3): LINKED is neutral, UPDATED accent, the broken ones bad. */
export const LINK_BADGE: Record<LinkState, { readonly text: string; readonly tone: 'neutral' | 'accent' | 'bad' }> = {
  linked: { text: 'Linked', tone: 'neutral' },
  updated: { text: 'Updated', tone: 'accent' },
  missing: { text: 'Missing', tone: 'bad' },
  'not-a-part': { text: 'Not a part', tone: 'bad' },
  'part-fails': { text: 'Part fails', tone: 'bad' },
}

/** A part stack's result as "20.925 +0.170/−0.100". */
export const partResultText = (system: UnitSystem, stack: StackResult): string =>
  `${len(system, stack.nominal)} ${deviations(system, stack.upperDeviation, stack.lowerDeviation)}`

/** The line under a linked row that says what its state means; null when the link is plain. */
export function linkNote(system: UnitSystem, link: ResolvedLink): string | null {
  switch (link.state) {
    case 'updated':
      return `Changed since this assembly was saved: was ${partResultText(system, link.row.last.stack)}.`
    case 'missing':
      return 'Deleted: last known values used.'
    case 'not-a-part':
      return 'Switched to Assembly: last known values used.'
    case 'part-fails':
      return 'Its own chain has an error: last known values used.'
    case 'linked':
      return link.unsavedEdits ? 'Unsaved edits in its tab are not used until it is saved.' : null
  }
}

/** The state in words for the report: "Linked", "Missing: last known values". */
export function linkStateText(link: Pick<ResolvedLink, 'state'>): string {
  const word = LINK_BADGE[link.state].text
  return isBroken(link.state) ? `${word}: last known values` : word
}

/** "1 linked part uses last known values: Shim pack (deleted)." for the note above the chain. */
export function brokenLinksNote(links: readonly ResolvedLink[]): string | null {
  if (links.length === 0) return null
  const why: Record<LinkState, string> = { linked: '', updated: '', missing: 'deleted', 'not-a-part': 'not a part stack', 'part-fails': 'its chain fails' }
  const names = links.map((link) => `${link.partName || link.calculationName} (${why[link.state]})`).join(', ')
  return `${links.length === 1 ? '1 linked part uses' : `${links.length} linked parts use`} last known values: ${names}.`
}

/** What a new link records of a Part stack picked in the link picker; null when its chain fails. */
export function snapshotOfPart(part: PartStack): LinkSnapshot | null {
  if (!part.analysis.ok) return null
  const { calculation, inputs } = part
  return {
    stack: recordedStack(part.analysis.value.stackResult),
    partName: inputs.partName.trim() || calculation.name,
    resultName: inputs.resultName.trim() || 'Result',
    calculationName: calculation.name,
    folderName: part.folderName,
    updatedAt: calculation.updatedAt,
  }
}
