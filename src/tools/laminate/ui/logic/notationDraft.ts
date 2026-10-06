// The stacking notation as typed on the Layup step. A notation that parses
// replaces the ply angles at once; one that does not (still being typed, or
// a typo) is kept as typed, with the reader's error, until it is fixed. While
// it does not parse the Layup step is marked and Next is blocked, so the
// results are never run on the previous layup by mistake.
//
// The typed text is kept by the page, not the field, so it survives going to
// another step and back. It is dropped as soon as the plies change some other
// way (Reset, the ply editor, an optimiser result): then it no longer belongs
// to the stack on screen.
import { formatLayup, parseLayup } from '../../calc'

export interface NotationDraft {
  /** What is typed in the field. */
  readonly text: string
  /** The notation of the plies at the time it was typed (after its last valid parse). */
  readonly typedOn: string
}

/** The typed text if it still belongs to these plies, else null (the field shows their notation). */
export function liveNotationDraft(draft: NotationDraft | null, anglesDeg: readonly number[]): NotationDraft | null {
  return draft !== null && draft.typedOn === formatLayup(anglesDeg) ? draft : null
}

/** The draft after typing `text` on plies at `anglesDeg`, and the new ply angles when it parses. */
export function typeNotation(text: string, anglesDeg: readonly number[]): { draft: NotationDraft; anglesDeg: readonly number[] | null } {
  const parsed = parseLayup(text)
  const next = parsed.ok ? parsed.value : null
  return { draft: { text, typedOn: formatLayup(next ?? anglesDeg) }, anglesDeg: next }
}

/** Why the typed notation cannot be used, or null when it parses (or nothing is typed). */
export function notationError(draft: NotationDraft | null): string | null {
  if (draft === null) return null
  const parsed = parseLayup(draft.text)
  return parsed.ok ? null : parsed.error
}

/** On leaving the field: a notation that parses is shown tidied up; one that does not stays to be fixed. */
export const leaveNotation = (draft: NotationDraft | null): NotationDraft | null => (notationError(draft) === null ? null : draft)
