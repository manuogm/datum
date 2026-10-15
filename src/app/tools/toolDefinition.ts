// What the app needs to know about a tool's inputs to keep its calculations:
// where a new calculation starts, how stored inputs are read back, and the
// snapshot builder that summarises a result. Each tool exports one.
import { summaryOf, type CalculationSummary, type Library, type ToolSnapshot } from '../../core/library'
import type { Result } from '../../core/result'

export interface ToolDefinition<Inputs> {
  /** Where a new calculation starts. */
  defaultInputs: Inputs
  /** Stored inputs → inputs (null: the example); anything malformed keeps its default. */
  inputsFrom: (stored: unknown) => Inputs
  /** What the tool reports about the inputs, or why it cannot analyse them. */
  snapshot: (inputs: Inputs) => Result<ToolSnapshot<Inputs>>
  /**
   * What Save writes, when it is more than the inputs on screen: a Tolerance
   * Stack-up Assembly also records the linked part results it used. Returns
   * the same inputs when there is nothing to add. Omitted: the inputs as they are.
   */
  toSave?: (inputs: Inputs) => Inputs
  /**
   * What a calculation stores once calculations it links were saved or
   * deleted (the library before → after the change): a Tolerance Stack-up
   * Assembly records the last saved values of a part whose link just broke,
   * so it keeps them (app/tools/dependents). Returns the same inputs when
   * there is nothing to record. Omitted: nothing is recorded.
   */
  afterLinkedChange?: (inputs: Inputs, before: Library, after: Library) => Inputs
  /**
   * Inputs with unsaved edits, given what the app has since recorded in the
   * stored ones (afterLinkedChange): the edits stay, what was recorded is
   * taken. Omitted: the edits are kept as they are.
   */
  rebase?: (edited: Inputs, stored: Inputs) => Inputs
}

/** The summary the library lists for these inputs; null when the tool cannot analyse them. */
export function summaryFor<Inputs>(tool: ToolDefinition<Inputs>, inputs: Inputs): CalculationSummary | null {
  const result = tool.snapshot(inputs)
  return result.ok ? summaryOf(result.value) : null
}
