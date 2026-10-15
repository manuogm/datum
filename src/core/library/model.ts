// The library data model: folders, nested like a file directory, holding
// calculations. A calculation is one tool's inputs plus a short summary of
// its result, both written when the user saves (there are no revisions: a
// save overwrites).

/** The calculation tools. Extend as new tools ship. */
export type ToolId = 'fit' | 'bolt' | 'lam' | 'stack'

/** A result judged against its requirement. */
export type JudgedStatus = 'pass' | 'review' | 'fail'

/**
 * Overall verdict of a calculation, shown as a status dot. 'none': the
 * result is not judged because no requirement is set (a grey dot, "No
 * requirement"), e.g. a stack-up without limits or a fit without a window.
 */
export type CalculationStatus = JudgedStatus | 'none'

/** One headline result (e.g. "u max" → "0.82"). */
export interface SnapshotFigure {
  label: string
  /** The figure as written in SI (value and unit), e.g. "20.825 … 21.095" mm. */
  value: string
  unit?: string
  /**
   * A length figure as numbers in mm: one value, or the min and max of a
   * range. A list then writes it in the viewer's unit system; value and unit
   * stay for summaries stored without it and for any other reader.
   */
  lengthsMm?: readonly number[]
}

/** What a tool reports about its current inputs: built by each tool's snapshot builder. */
export interface ToolSnapshot<Inputs = unknown> {
  tool: ToolId
  /** Short human title, e.g. "Ø25 H7/p6". */
  title: string
  status: CalculationStatus
  /** Headline numbers, most telling first. */
  figures: readonly SnapshotFigure[]
  /** Everything needed to reopen the tool in the same state. Must be JSON-safe. */
  inputs: Inputs
}

/** The result of a calculation as listed in a folder (see summaryOf). */
export interface CalculationSummary {
  title: string
  status: CalculationStatus
  /** One to three headline figures. */
  figures: readonly SnapshotFigure[]
}

export interface Folder {
  id: string
  name: string
  /** The folder it sits in; null at the top level (Home). */
  parentId: string | null
  /** ISO 8601 local timestamp (see app/format/timestamp). */
  createdAt: string
}

export interface Calculation {
  id: string
  /** The folder it sits in; null at the top level (Home). */
  folderId: string | null
  tool: ToolId
  name: string
  /** The tool's inputs, JSON-safe. null stands for the tool's worked example (the seeded examples). */
  inputs: unknown
  /** null when the tool cannot analyse the inputs. */
  summary: CalculationSummary | null
  createdAt: string
  /** When the inputs were last saved. */
  updatedAt: string
}

/** Everything the library store keeps. */
export interface Library {
  folders: Folder[]
  calculations: Calculation[]
}
