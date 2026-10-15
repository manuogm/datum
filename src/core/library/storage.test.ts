import { describe, expect, it } from 'vitest'
import type { Library } from './model'
import { isSeededExample, seedLibrary, withStackExamples } from './seed'
import { loadLibrary, migrate, saveLibrary, SCHEMA_VERSION, STORAGE_KEY, type KeyValueStore } from './storage'
import { LIBRARY } from './testData'

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

const SEED: Library = seedLibrary('2026-10-06T09:00:00')
const seed = () => SEED

describe('loadLibrary', () => {
  it('starts from the seed on first run, ignoring projects of earlier versions', () => {
    expect(loadLibrary(memoryStore({ 'datum.projects': '{"version":1}' }), seed)).toEqual({ state: SEED, canSave: true })
  })

  it('reads back what was saved', () => {
    const store = memoryStore()
    expect(saveLibrary(store, LIBRARY)).toBe(true)
    expect(JSON.parse(store.data[STORAGE_KEY]).version).toBe(SCHEMA_VERSION)
    expect(loadLibrary(store, seed)).toEqual({ state: LIBRARY, canSave: true })
  })

  it('sets unreadable data aside and starts from the seed', () => {
    const malformed = [
      '{not json',
      '{"version":1,"state":{"folders":"no","calculations":[]}}',
      '{"version":1,"state":{"folders":[{"id":1}],"calculations":[]}}',
      '"text"',
    ]
    for (const raw of malformed) {
      const store = memoryStore({ [STORAGE_KEY]: raw })
      const loaded = loadLibrary(store, seed)
      expect(loaded.state).toBe(SEED)
      expect(loaded.canSave).toBe(true)
      expect(loaded.problem).toMatch(/could not be read/)
      expect(store.data[`${STORAGE_KEY}.unreadable`]).toBe(raw)
    }
  })

  it('never overwrites data saved by a newer version', () => {
    const raw = JSON.stringify({ version: SCHEMA_VERSION + 1, state: {} })
    const loaded = loadLibrary(memoryStore({ [STORAGE_KEY]: raw }), seed)
    expect(loaded.canSave).toBe(false)
    expect(loaded.problem).toMatch(/newer version/)
  })

  it('works without storage, and when storage throws', () => {
    expect(loadLibrary(null, seed).canSave).toBe(false)
    const throwing: KeyValueStore = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(loadLibrary(throwing, seed)).toMatchObject({ state: SEED, canSave: false })
    expect(saveLibrary(throwing, SEED)).toBe(false)
    expect(saveLibrary(null, SEED)).toBe(false)
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
    expect(migrate(SCHEMA_VERSION - 2, { folders: [] }, steps)).toEqual({ folders: [], step1: true, step2: true })
  })

  it('gives up when a step is missing', () => {
    expect(migrate(SCHEMA_VERSION - 1, SEED, {})).toBeNull()
  })
})

describe('seedLibrary', () => {
  it('holds one example per tool in the Examples folder, and the stack-up Assembly that links its Part', () => {
    expect(SEED.folders.map((f) => f.name)).toEqual(['Examples'])
    expect(SEED.calculations.map((c) => [c.tool, c.folderId])).toEqual([
      ['fit', 'examples'],
      ['bolt', 'examples'],
      ['lam', 'examples'],
      ['stack', 'examples'],
      ['stack', 'examples'],
    ])
    const assembly = SEED.calculations[4]
    expect(assembly.name).toBe('Bearing end play')
    expect(JSON.stringify(assembly.inputs)).toContain('"calcId":"example-stack"')
  })

  it('marks the seeded examples, not the calculations the user makes', () => {
    expect(SEED.calculations.every((c) => isSeededExample(c.id))).toBe(true)
    expect(isSeededExample('k3x9a0b2')).toBe(false)
  })
})

describe('the version 1 → 2 migration', () => {
  const V1_NOW = '2026-10-01T08:00:00'
  const NOW = '2026-10-14T10:00:00'
  const version1 = (state: Library) => memoryStore({ [STORAGE_KEY]: JSON.stringify({ version: 1, state }) })

  it('adds the two stack-up examples to the Examples folder, leaving everything else as it was', () => {
    const before = seedLibrary(V1_NOW)
    const v1: Library = { ...before, calculations: before.calculations.filter((c) => c.tool !== 'stack').concat(LIBRARY.calculations) }
    const loaded = loadLibrary(version1(v1), seed, NOW)
    expect(loaded.migrated).toBe(true)
    expect(loaded.state.folders).toEqual(v1.folders)
    expect(loaded.state.calculations.slice(0, v1.calculations.length)).toEqual(v1.calculations)
    const added = loaded.state.calculations.slice(v1.calculations.length)
    expect(added.map((c) => [c.id, c.folderId, c.createdAt])).toEqual([
      ['example-stack', 'examples', NOW],
      ['example-stack-assembly', 'examples', NOW],
    ])
  })

  it('makes the Examples folder again if it was deleted', () => {
    const loaded = loadLibrary(version1(LIBRARY), seed, NOW)
    expect(loaded.state.folders).toEqual([...LIBRARY.folders, { id: 'examples', name: 'Examples', parentId: null, createdAt: NOW }])
    expect(loaded.state.calculations).toHaveLength(LIBRARY.calculations.length + 2)
  })

  it('leaves an example that is already there alone', () => {
    const current = seedLibrary(V1_NOW)
    expect(withStackExamples(current, NOW)).toBe(current)
  })
})
