// The one copy of the library in the running app. Loads from browser storage
// on first use (or seeds the Examples folder), saves after every change and
// picks up changes made in another browser tab. Screens use it via useLibrary.
import {
  loadLibrary,
  saveLibrary,
  seedLibrary,
  STORAGE_KEY,
  type KeyValueStore,
  type Library,
  type LoadedLibrary,
} from '../../core/library'
import type { Result } from '../../core/result'
import { localTimestamp } from '../format/timestamp'

let loaded: LoadedLibrary | null = null
const listeners = new Set<() => void>()

function browserStorage(): KeyValueStore | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function load(): LoadedLibrary {
  let seeded = false
  const storage = browserStorage()
  const result = loadLibrary(storage, () => {
    seeded = true
    return seedLibrary(localTimestamp())
  })
  // Keep the seed of a first visit, so the examples keep their dates. (A seed
  // shown in place of unreadable or newer data is not saved: canSave or the
  // set-aside copy protect that data.)
  if (seeded && result.canSave && !result.problem) saveLibrary(storage, result.state)
  return result
}

function current(): LoadedLibrary {
  loaded ??= load()
  return loaded
}

function notify(): void {
  for (const listener of listeners) listener()
}

function onOtherTabChange(event: StorageEvent): void {
  if (event.key !== STORAGE_KEY) return
  loaded = load()
  notify()
}

export function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener('storage', onOtherTabChange)
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) window.removeEventListener('storage', onOtherTabChange)
  }
}

export function getSnapshot(): LoadedLibrary {
  return current()
}

/**
 * Applies a change made by a core/library command, then saves (when storage
 * allows). A command that changed nothing returns the same library: then
 * nothing is saved and no screen re-renders.
 */
export function applyChange(change: (library: Library) => Result<Library>): Result<Library> {
  const { state, canSave, problem } = current()
  const result = change(state)
  if (!result.ok || result.value === state) return result
  const saved = canSave && saveLibrary(browserStorage(), result.value)
  loaded = {
    state: result.value,
    canSave,
    problem: canSave && !saved ? 'The browser refused to save (storage full?). Recent changes last for this visit only.' : problem,
  }
  notify()
  return result
}
