// The guided steps of the Tolerance Stack-up tool. Both modes have four:
//   Part:     Requirement · Contributors · Method · Results
//   Assembly: Requirement · Parts        · Method · Results
// so switching mode keeps the place. A step is marked when the engine
// rejects its inputs, so the step bar points at what to fix.
import type { StepDef } from '../../../../app/ui'
import type { Result } from '../../../../core/result'
import type { StackAnalysis } from '../../calc'
import { lowerName, upperName } from './verdict'
import type { StackInputs, StackMode } from '../state/stackInputs'

export type StackStepId = 'requirement' | 'chain' | 'method' | 'results'

const LABELS: Record<StackMode, Record<StackStepId, string>> = {
  part: { requirement: 'Requirement', chain: 'Contributors', method: 'Method', results: 'Results' },
  assembly: { requirement: 'Requirement', chain: 'Parts', method: 'Method', results: 'Results' },
}

const ORDER: readonly StackStepId[] = ['requirement', 'chain', 'method', 'results']

/** A step's name, e.g. 'Contributors' (Part) or 'Parts' (Assembly) for the chain. */
export const stepLabel = (id: StackStepId, mode: StackMode): string => LABELS[mode][id]

/** The step whose inputs the engine rejects, with the engine's explanation and, for a row, its index (0-based). */
export interface StepFault {
  readonly step: StackStepId
  readonly error: string
  readonly row: number | null
}

/**
 * Where the inputs go wrong, or null when the analysis runs. The engine
 * names a row as "Row 3 …" (its first problem only); the requirement and
 * the settings have their own messages.
 */
export function stepFault(analysis: Result<StackAnalysis>): StepFault | null {
  if (analysis.ok) return null
  const { error } = analysis
  const row = /^Row (\d+)\b/.exec(error)
  if (row) return { step: 'chain', error, row: Number(row[1]) - 1 }
  if (/allowed result|drawing standard/.test(error)) return { step: 'requirement', error, row: null }
  if (/^Choose a method/.test(error)) return { step: 'method', error, row: null }
  return { step: 'chain', error, row: null }
}

/**
 * The fault as the screen shows it. A row just added is not flagged while it
 * is being typed (design §9.2, draft rule): its fault is held back until a
 * number field of the row has been left once. An empty chain is a step still
 * to do, not an error, until the user has gone past the chain step (design
 * §9.1): a new calculation does not open with a red step. Next stays
 * disabled meanwhile, with its note.
 */
export function shownFault(fault: StepFault | null, inputs: Pick<StackInputs, 'rows'>, fresh: ReadonlySet<string>, pastChain = true): StepFault | null {
  if (fault === null) return null
  if (fault.row === null) return fault.step === 'chain' && inputs.rows.length === 0 && !pastChain ? null : fault
  const row = inputs.rows[fault.row]
  return row && fresh.has(row.id) ? null : fault
}

/** Index of the chain step in both modes' step lists. */
export const CHAIN_STEP = ORDER.indexOf('chain')

/** The title of the engine's explanation on the step at fault, and of Results when it cannot run. */
export const FAULT_TITLE = 'This stack cannot be analysed'

/** StepPage's `problem` on step `id`: the engine's explanation when the fault is there. */
export const stepProblem = (fault: StepFault | null, id: StackStepId) => (fault?.step === id ? { title: FAULT_TITLE, detail: fault.error } : null)

/** The four steps of the mode, the faulty one marked. */
export function stackSteps(mode: StackMode, fault: StepFault | null): readonly StepDef[] {
  return ORDER.map((id) => {
    const step = { id, label: stepLabel(id, mode) }
    return fault?.step === id ? { ...step, invalid: fault.error } : step
  })
}

/** Requirement, "More options": the drawing standard when not ISO, and each end label filled in. */
export function requirementOptionsChanged(inputs: Pick<StackInputs, 'standard' | 'startLabel' | 'endLabel'>): number {
  return (inputs.standard === 'iso' ? 0 : 1) + (inputs.startLabel.trim() ? 1 : 0) + (inputs.endLabel.trim() ? 1 : 0)
}

/** The rows by kind: "3 contributors" (Part), "1 linked · 3 direct" (Assembly). */
export function chainCount(inputs: Pick<StackInputs, 'mode' | 'rows'>): string {
  const linked = inputs.rows.filter((row) => row.kind === 'linked').length
  const direct = inputs.rows.length - linked
  if (inputs.mode === 'assembly') return `${linked} linked · ${direct} direct`
  return `${direct} ${direct === 1 ? 'contributor' : 'contributors'}`
}

/** The input of a row the engine's message is about, to outline it (design §9.2). */
export type RowField = 'direction' | 'nominal' | 'tolerance' | 'zone' | 'material' | 'feature' | 'datum' | 'unequal' | 'projected' | 'link'

/** Which input of the row a message names; null when it is the row as a whole. */
export function faultField(error: string): RowField | null {
  // What follows 'Row 3 "label"': the label itself may hold any word.
  const message = error.replace(/^Row \d+( "[^"]*")?/, '')
  if (/±/.test(message)) return 'tolerance'
  if (/needs a direction/.test(message)) return 'direction'
  if (/needs a nominal/.test(message)) return 'nominal'
  if (/linked part stack/.test(message)) return 'link'
  if (/datum/.test(message)) return 'datum'
  if (/toleranced feature/.test(message)) return 'feature'
  if (/cannot take [ⓂⓁ]|material condition/.test(message)) return 'material'
  if (/unequally disposed|adding material/.test(message)) return 'unequal'
  if (/projected/.test(message)) return 'projected'
  if (/tolerance value|tolerance cannot be negative|zone cannot carry/.test(message)) return 'zone'
  if (/tolerance|deviation|size/.test(message)) return 'tolerance'
  return null
}

/** "Housing, shoulder to circlip groove through 3 contributors, by worst case and RSS." */
export function resultsHint(inputs: StackInputs, analysis: StackAnalysis): string {
  const rows = analysis.contributors.length
  if (inputs.mode === 'assembly') {
    const linked = inputs.rows.filter((row) => row.kind === 'linked').length
    const of = linked === 0 ? '' : linked === 1 ? ', 1 of them a linked part stack' : `, ${linked} of them linked part stacks`
    return `${upperName(inputs.resultName)} through ${rows} ${rows === 1 ? 'row' : 'rows'}${of}, by worst case and RSS.`
  }
  const part = inputs.partName.trim()
  const name = part ? `${part}, ${lowerName(inputs.resultName)}` : upperName(inputs.resultName)
  return `${name} through ${rows} ${rows === 1 ? 'contributor' : 'contributors'}, by worst case and RSS.`
}
