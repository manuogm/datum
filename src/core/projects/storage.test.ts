import { describe, expect, it } from 'vitest'
import type { ProjectsState } from './model'
import { seedProjects } from './seed'
import { loadProjects, migrate, saveProjects, SCHEMA_VERSION, STORAGE_KEY, type KeyValueStore } from './storage'

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value
    },
  }
}

const SEED: ProjectsState = { projects: [], active: null }
const seed = () => SEED

describe('loadProjects', () => {
  it('starts from the seed on first run', () => {
    expect(loadProjects(memoryStore(), seed)).toEqual({ state: SEED, canSave: true })
  })

  it('reads back what was saved', () => {
    const store = memoryStore()
    const state = seedProjects()
    expect(saveProjects(store, state)).toBe(true)
    expect(JSON.parse(store.data[STORAGE_KEY]).version).toBe(SCHEMA_VERSION)
    expect(loadProjects(store, seed)).toEqual({ state, canSave: true })
  })

  it('sets unreadable data aside and starts from the seed', () => {
    for (const raw of ['{not json', '{"version":1,"state":{"projects":"no"}}', '"text"']) {
      const store = memoryStore({ [STORAGE_KEY]: raw })
      const loaded = loadProjects(store, seed)
      expect(loaded.state).toBe(SEED)
      expect(loaded.canSave).toBe(true)
      expect(loaded.problem).toMatch(/could not be read/)
      expect(store.data[`${STORAGE_KEY}.unreadable`]).toBe(raw)
    }
  })

  it('never overwrites data saved by a newer version', () => {
    const raw = JSON.stringify({ version: SCHEMA_VERSION + 1, state: {} })
    const loaded = loadProjects(memoryStore({ [STORAGE_KEY]: raw }), seed)
    expect(loaded.canSave).toBe(false)
    expect(loaded.problem).toMatch(/newer version/)
  })

  it('works without storage, and when storage throws', () => {
    expect(loadProjects(null, seed).canSave).toBe(false)
    const throwing: KeyValueStore = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(loadProjects(throwing, seed)).toMatchObject({ state: SEED, canSave: false })
    expect(saveProjects(throwing, SEED)).toBe(false)
    expect(saveProjects(null, SEED)).toBe(false)
  })
})

describe('migrate', () => {
  it('leaves current documents alone', () => {
    expect(migrate(SCHEMA_VERSION, SEED)).toBe(SEED)
  })

  it('runs each step from the stored version up to the current one', () => {
    const steps = {
      [SCHEMA_VERSION - 2]: (s: unknown) => ({ ...(s as object), step1: true }),
      [SCHEMA_VERSION - 1]: (s: unknown) => ({ ...(s as object), step2: true }),
    }
    expect(migrate(SCHEMA_VERSION - 2, { projects: [] }, steps)).toEqual({ projects: [], step1: true, step2: true })
  })

  it('gives up when a step is missing', () => {
    expect(migrate(SCHEMA_VERSION - 1, SEED, {})).toBeNull()
  })
})
