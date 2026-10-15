// Keeps the library in the browser (localStorage) as one versioned JSON
// document. Storage can be missing, blocked, full, corrupt or written by a
// newer Datum; in each case the app still starts, and data it cannot read is
// never overwritten silently. Data saved under the key of the earlier
// project-based Datum ("datum.projects") is left alone and not read.
import type { Library } from './model'
import { withStackExamples } from './seed'

export const STORAGE_KEY = 'datum.library'
/** Raise when the stored shape changes, and add a migration below. */
export const SCHEMA_VERSION = 2

/** The part of localStorage the library store needs (injectable for tests). */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** Turns a stored state into the next version's; `now` stamps anything it adds. */
type Migration = (state: unknown, now: string) => unknown

/**
 * MIGRATIONS[n] turns the state of a version-n document into version n + 1.
 *   1 → 2: the Tolerance Stack-up's two examples join the Examples folder.
 */
const MIGRATIONS: Readonly<Record<number, Migration>> = {
  1: (state, now) => (isLibrary(state) ? withStackExamples(state, now) : state),
}

export interface LoadedLibrary {
  state: Library
  /** False when saving would lose data (blocked storage, newer document): changes then last for this visit only. */
  canSave: boolean
  /** Plain-English explanation when the stored library could not be used. */
  problem?: string
  /** Read from an earlier version and brought up to date: save it, so the change sticks. */
  migrated?: boolean
}

/** Brings a stored state up to SCHEMA_VERSION; null when no migration path exists. */
export function migrate(
  version: number,
  state: unknown,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
  now = '',
): unknown {
  let current = state
  for (let v = version; v < SCHEMA_VERSION; v++) {
    const step = migrations[v]
    if (!step) return null
    current = step(current, now)
  }
  return current
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** A light structural check: enough to know the screens will not crash on it. */
function isLibrary(value: unknown): value is Library {
  if (!isObject(value) || !Array.isArray(value.folders) || !Array.isArray(value.calculations)) return false
  const folders = value.folders.every(
    (f) =>
      isObject(f) &&
      typeof f.id === 'string' &&
      typeof f.name === 'string' &&
      (f.parentId === null || typeof f.parentId === 'string'),
  )
  const calculations = value.calculations.every(
    (c) =>
      isObject(c) &&
      typeof c.id === 'string' &&
      typeof c.name === 'string' &&
      typeof c.tool === 'string' &&
      typeof c.updatedAt === 'string' &&
      (c.folderId === null || typeof c.folderId === 'string') &&
      (c.summary === null || (isObject(c.summary) && Array.isArray(c.summary.figures))),
  )
  return folders && calculations
}

function readRaw(store: KeyValueStore | null): { raw: string | null } | null {
  if (!store) return null
  try {
    return { raw: store.getItem(STORAGE_KEY) }
  } catch {
    return null
  }
}

/**
 * Reads the stored library, falling back to the seed (the Examples folder).
 * A library of an earlier version is migrated; `now` stamps what that adds.
 * A migrated library is saved back by the caller (see `migrated`).
 */
export function loadLibrary(store: KeyValueStore | null, seed: () => Library, now = ''): LoadedLibrary {
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
      problem: 'This library was saved by a newer version of Datum. Showing the examples; your calculations are untouched.',
    }
  }
  const state = Number.isInteger(version) && isObject(document) ? migrate(version, document.state, MIGRATIONS, now) : null
  if (isLibrary(state)) return version < SCHEMA_VERSION ? { state, canSave: true, migrated: true } : { state, canSave: true }

  backUp(store, read.raw)
  return {
    state: seed(),
    canSave: true,
    problem: `The stored library could not be read and were set aside under "${STORAGE_KEY}.unreadable".`,
  }
}

function backUp(store: KeyValueStore | null, raw: string): void {
  try {
    store?.setItem(`${STORAGE_KEY}.unreadable`, raw)
  } catch {
    // Nothing more can be done; the seed is shown either way.
  }
}

/** Writes the library; returns false when the browser refused (e.g. storage full). */
export function saveLibrary(store: KeyValueStore | null, state: Library): boolean {
  if (!store) return false
  try {
    store.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, state }))
    return true
  } catch {
    return false
  }
}
