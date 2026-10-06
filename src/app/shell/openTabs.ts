// The calculation tabs open in the top bar, kept in localStorage so they
// survive a reload. Tabs of calculations that no longer exist (deleted here
// or in another browser tab) are dropped when the bar is drawn (see
// DocumentTabs), so the list itself only needs opening and closing.
import { useSyncExternalStore } from 'react'
import { parseTabs, withoutTab, withTab } from './tabList'

const STORAGE_KEY = 'datum.tabs'

let tabs: readonly string[] | null = null
const listeners = new Set<() => void>()

function read(): readonly string[] {
  try {
    return parseTabs(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return []
  }
}

function current(): readonly string[] {
  tabs ??= read()
  return tabs
}

function replace(next: readonly string[]): void {
  if (next === current()) return
  tabs = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // The tabs then last for this visit only.
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function openTab(id: string): void {
  replace(withTab(current(), id))
}

export function closeTab(id: string): void {
  replace(withoutTab(current(), id))
}

export function useOpenTabs(): readonly string[] {
  return useSyncExternalStore(subscribe, current)
}

/** The folder Home last showed (null = top level), so the Home tab returns to it. */
let homeFolderId: string | null = null

export function rememberHomeFolder(folderId: string | null): void {
  homeFolderId = folderId
}

export function lastHomeFolder(): string | null {
  return homeFolderId
}
