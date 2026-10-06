// What the app needs to know about a tool's inputs to keep its calculations:
// where a new calculation starts, how stored inputs are read back, and the
// snapshot builder that summarises a result. Each tool exports one.
import { summaryOf, type CalculationSummary, type ToolSnapshot } from '../../core/library'
import type { Result } from '../../core/result'

export interface ToolDefinition<Inputs> {
  /** Where a new calculation starts. */
  defaultInputs: Inputs
  /** Stored inputs → inputs (null: the example); anything malformed keeps its default. */
  inputsFrom: (stored: unknown) => Inputs
  /** What the tool reports about the inputs, or why it cannot analyse them. */
  snapshot: (inputs: Inputs) => Result<ToolSnapshot<Inputs>>
}

/** The summary the library lists for these inputs; null when the tool cannot analyse them. */
export function summaryFor<Inputs>(tool: ToolDefinition<Inputs>, inputs: Inputs): CalculationSummary | null {
  const result = tool.snapshot(inputs)
  return result.ok ? summaryOf(result.value) : null
}
