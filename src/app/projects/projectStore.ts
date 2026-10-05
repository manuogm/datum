// The one copy of the projects state in the running app. Loads from browser
// storage on first use (or seeds the demo projects), saves after every change
// and picks up changes made in another tab. Screens use it via useProjects.
import {
  loadProjects,
  saveProjects,
  seedProjects,
  STORAGE_KEY,
  type KeyValueStore,
  type LoadedProjects,
  type ProjectsState,
} from '../../core/projects'
import type { Result } from '../../core/result'

let loaded: LoadedProjects | null = null
const listeners = new Set<() => void>()

function browserStorage(): KeyValueStore | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function current(): LoadedProjects {
  loaded ??= loadProjects(browserStorage(), seedProjects)
  return loaded
}

function notify(): void {
  for (const listener of listeners) listener()
}

function onOtherTabChange(event: StorageEvent): void {
  if (event.key !== STORAGE_KEY) return
  loaded = loadProjects(browserStorage(), seedProjects)
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

export function getSnapshot(): LoadedProjects {
  return current()
}

/** Applies a change made by a core/projects command, then saves (when storage allows). */
export function applyChange(change: (state: ProjectsState) => Result<ProjectsState>): Result<ProjectsState> {
  const result = change(current().state)
  if (result.ok) replaceState(result.value)
  return result
}

/** Makes `state` the current projects state and saves it. */
export function replaceState(state: ProjectsState): void {
  const { canSave, problem } = current()
  const saved = canSave && saveProjects(browserStorage(), state)
  loaded = {
    state,
    canSave,
    problem: canSave && !saved ? 'The browser refused to save projects (storage full?). Export the dossier to keep your work.' : problem,
  }
  notify()
}
