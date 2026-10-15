// What the library lists about a stack-up calculation: the result's name (in
// the title), its status (the verdict by the chosen method, 'none' without a
// requirement, capped at review when a linked part is broken), the worst-case
// and RSS ranges and the capability (or σ) in mm, and the complete inputs.
// An assembly is worked out with the linked parts' saved results.
import type { Library, ToolSnapshot } from '../../../core/library'
import { fail, ok, type Result } from '../../../core/result'
import { index, range, sigma } from './logic/format'
import { stackResults, stackStatus } from './logic/stackResults'
import type { StackInputs } from './state/stackInputs'

/** Fails, with the engine's explanation, when the chain cannot be analysed (e.g. an empty chain). */
export function stackSnapshot(inputs: StackInputs, library: Library): Result<ToolSnapshot<StackInputs>> {
  const results = stackResults(inputs, library)
  if (!results.analysis.ok) return fail(results.analysis.error)
  const analysis = results.analysis.value
  const { cpk } = analysis.capability
  return ok({
    tool: 'stack',
    title: analysis.name,
    status: stackStatus(analysis, results.brokenLinks.length),
    figures: [
      { label: 'WC', value: range('si', analysis.worstCase.min, analysis.worstCase.max), unit: 'mm' },
      { label: 'RSS', value: range('si', analysis.rss.min, analysis.rss.max), unit: 'mm' },
      cpk !== null ? { label: 'Cpk', value: index(cpk) } : { label: 'σ', value: sigma('si', analysis.sigma), unit: 'mm' },
    ],
    inputs,
  })
}
