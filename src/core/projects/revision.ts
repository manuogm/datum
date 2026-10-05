// The contract between tools and projects: what a tool hands over when the
// user saves a revision. Tools build a snapshot; the projects module stores it.

/** Tools that can save revisions ('mat' = a material selection). Extend as new tools ship. */
export type ToolId = 'fit' | 'bolt' | 'lam' | 'mat'

/** One headline result shown in project history (e.g. "Fit" → "H7/p6"). */
export interface SnapshotFigure {
  label: string
  value: string
  unit?: string
}

/** A serialisable record of one calculation, as handed over by a tool. */
export interface ToolSnapshot<Inputs = unknown> {
  tool: ToolId
  /** Short human title, e.g. "Ø25 H7/p6". */
  title: string
  /** Overall verdict shown as a badge in project history. */
  status: 'pass' | 'review' | 'fail'
  /**
   * Headline numbers for lists and history rows. Keep labels stable between
   * revisions: the "changes since" list pairs figures by label.
   */
  figures: readonly SnapshotFigure[]
  /** Everything needed to reopen the tool in the same state. Must be JSON-safe. */
  inputs: Inputs
  /** Ids of materials (core/materials) the calculation uses, for "Used in" on the Materials page. */
  materialIds?: readonly string[]
}
