// What the stack-up screens show for the inputs: the engine's analysis, run
// on the inputs with each linked part resolved in the library (links.ts),
// and the status the library lists. Lengths in mm.
import type { CalculationStatus, Library } from '../../../../core/library'
import type { Result } from '../../../../core/result'
import { analyseStack, type StackAnalysis, type StackInput } from '../../calc'
import type { StackInputs } from '../state/stackInputs'
import { engineInput, type LinkValues } from './engineInput'
import { isBroken, resolveLinks, type ResolvedLink } from './links'

export interface StackResults {
  readonly input: StackInput
  readonly analysis: Result<StackAnalysis>
  /** Each linked row resolved, by row id. */
  readonly links: ReadonlyMap<string, ResolvedLink>
  /** Linked rows that only have their last known values (missing, not a part, part fails). */
  readonly brokenLinks: readonly ResolvedLink[]
}

export function stackResults(inputs: StackInputs, library: Library, hasDraft?: (id: string) => boolean): StackResults {
  const links = resolveLinks(inputs, library, hasDraft)
  const values = new Map<string, LinkValues>([...links].map(([id, link]) => [id, { label: link.partName || link.calculationName, stack: link.stack }]))
  const input = engineInput(inputs, values)
  return {
    input,
    analysis: analyseStack(input),
    links,
    brokenLinks: [...links.values()].filter((link) => isBroken(link.state)),
  }
}

/**
 * The status of a stack: the engine's verdict by the chosen method, 'none'
 * without a requirement. A broken link caps a pass at review: the numbers
 * are real, but they rest on a part nobody can check any more; it never
 * lowers a review or a fail (design §6.3).
 */
export function stackStatus(analysis: StackAnalysis, brokenLinks: number): CalculationStatus {
  const status = analysis.verdict?.status ?? 'none'
  return status === 'pass' && brokenLinks > 0 ? 'review' : status
}
