// Keeps projects in the browser (localStorage) as one versioned JSON
// document. Storage can be missing, blocked, full, corrupt or written by a
// newer Datum; in each case the app still starts, and data it cannot read is
// never overwritten silently.
import type { ProjectsState } from './model'

export const STORAGE_KEY = 'datum.projects'
/** Raise when the stored shape changes, and add a migration below. */
export const SCHEMA_VERSION = 1

/** The part of localStorage the projects store needs (injectable for tests). */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

type Migration = (state: unknown) => unknown

/**
 * MIGRATIONS[n] turns the state of a version-n document into version n + 1.
 * Empty while version 1 is the only one that has shipped.
 */
const MIGRATIONS: Readonly<Record<number, Migration>> = {}

export interface LoadedProjects {
  state: ProjectsState
  /** False when saving would lose data (blocked storage, newer document): changes then last for this visit only. */
  canSave: boolean
  /** Plain-English explanation when the stored projects could not be used. */
  problem?: string
}

/** Brings a stored state up to SCHEMA_VERSION; null when no migration path exists. */
export function migrate(
  version: number,
  state: unknown,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
): unknown {
  let current = state
  for (let v = version; v < SCHEMA_VERSION; v++) {
    const step = migrations[v]
    if (!step) return null
    current = step(current)
  }
  return current
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** A light structural check: enough to know the screens will not crash on it. */
function isProjectsState(value: unknown): value is ProjectsState {
  if (!isObject(value) || !Array.isArray(value.projects)) return false
  if (value.active !== null && !isObject(value.active)) return false
  return value.projects.every(
    (p) =>
      isObject(p) &&
      typeof p.id === 'string' &&
      typeof p.name === 'string' &&
      Array.isArray(p.parts) &&
      Array.isArray(p.calculations) &&
      Array.isArray(p.decisions) &&
      Array.isArray(p.team) &&
      isObject(p.targets),
  )
}

function readRaw(store: KeyValueStore | null): { raw: string | null } | null {
  if (!store) return null
  try {
    return { raw: store.getItem(STORAGE_KEY) }
  } catch {
    return null
  }
}

/** Reads the stored projects, falling back to the seed (demo) data. */
export function loadProjects(store: KeyValueStore | null, seed: () => ProjectsState): LoadedProjects {
  const read = readRaw(store)
  if (!read) {
    return { state: seed(), canSave: false, problem: 'Browser storage is unavailable: changes last for this visit only.' }
  }
  if (read.raw === null) return { state: seed(), canSave: true }

  let document: unknown
  try {
    document = JSON.parse(read.raw)
  } catch {
    document = undefined
  }
  const version = isObject(document) && typeof document.version === 'number' ? document.version : NaN
  if (version > SCHEMA_VERSION) {
    return {
      state: seed(),
      canSave: false,
      problem: 'These projects were saved by a newer version of Datum. Showing demo data; your projects are untouched.',
    }
  }
  const state = Number.isInteger(version) && isObject(document) ? migrate(version, document.state) : null
  if (isProjectsState(state)) return { state, canSave: true }

  backUp(store, read.raw)
  return {
    state: seed(),
    canSave: true,
    problem: `Stored projects could not be read and were set aside under "${STORAGE_KEY}.unreadable".`,
  }
}

function backUp(store: KeyValueStore | null, raw: string): void {
  try {
    store?.setItem(`${STORAGE_KEY}.unreadable`, raw)
  } catch {
    // Nothing more can be done; the seed is shown either way.
  }
}

/** Writes the projects; returns false when the browser refused (e.g. storage full). */
export function saveProjects(store: KeyValueStore | null, state: ProjectsState): boolean {
  if (!store) return false
  try {
    store.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, state }))
    return true
  } catch {
    return false
  }
}
