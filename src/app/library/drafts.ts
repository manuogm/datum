// Unsaved edits of open calculations, kept in memory while the app runs: a
// calculation's tab can be left and come back to without losing them, and
// the tab bar shows a dot on each calculation that has some. Save writes a
// draft to the library; "Exit without saving" drops it. A reload loses
// drafts, so the browser warns before leaving while any exist.
import { useSyncExternalStore } from 'react'
import type { Calculation, CalculationSummary } from '../../core/library'
import { libraryActions } from './useLibrary'

export interface Draft {
  /** The inputs on screen, JSON-safe. */
  inputs: unknown
  /** The summary of those inputs, worked out only when saving. */
  summarize: () => CalculationSummary | null
}

let drafts: ReadonlyMap<string, Draft> = new Map()
const listeners = new Set<() => void>()

function replace(next: ReadonlyMap<string, Draft>): void {
  drafts = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function draftOf(id: string): Draft | undefined {
  return drafts.get(id)
}

/** The latest inputs of a calculation: its unsaved draft if it has one, else the stored inputs. */
export function latestInputs(calculation: Calculation): unknown {
  return drafts.get(calculation.id)?.inputs ?? calculation.inputs
}

export function setDraft(id: string, draft: Draft): void {
  replace(new Map(drafts).set(id, draft))
}

export function discardDraft(id: string): void {
  if (!drafts.has(id)) return
  const next = new Map(drafts)
  next.delete(id)
  replace(next)
}

/** Writes the draft to the library; true when saved (or nothing was unsaved). */
export function saveDraft(id: string): boolean {
  const draft = drafts.get(id)
  if (!draft) return true
  const saved = libraryActions.saveCalculation(id, draft.inputs, draft.summarize())
  if (saved.ok) discardDraft(id)
  return saved.ok
}

/** Every calculation with unsaved edits, by id. */
export function useDrafts(): ReadonlyMap<string, Draft> {
  return useSyncExternalStore(subscribe, () => drafts)
}

// Reloading or closing the page would lose the drafts: ask the browser to warn first.
window.addEventListener('beforeunload', (event) => {
  if (drafts.size > 0) event.preventDefault()
})
