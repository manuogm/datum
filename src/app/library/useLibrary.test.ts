import { beforeAll, describe, expect, it, vi } from 'vitest'

// The library, drafts and tabs live in the browser: give them a window with
// an in-memory localStorage before loading them.
const stored = new Map<string, string>()
vi.stubGlobal('window', {
  localStorage: {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => void stored.set(key, value),
    removeItem: (key: string) => void stored.delete(key),
  },
  addEventListener: () => {},
  removeEventListener: () => {},
})

let actions: typeof import('./useLibrary').libraryActions
let drafts: typeof import('./drafts')
let tabs: typeof import('../shell/openTabs')

beforeAll(async () => {
  actions = (await import('./useLibrary')).libraryActions
  drafts = await import('./drafts')
  tabs = await import('../shell/openTabs')
})

const openTabIds = (): unknown => JSON.parse(stored.get('datum.tabs') ?? '[]')

/** A new calculation, open in a tab, with unsaved edits. */
function openEditedCalculation(name: string, folderId: string | null): string {
  const created = actions.createCalculation({ tool: 'lam', name, folderId, inputs: {}, summary: null })
  if (!created.ok) throw new Error(created.error)
  tabs.openTab(created.value)
  drafts.setDraft(created.value, { inputs: { edited: true }, summarize: () => null })
  return created.value
}

describe('deleting calculations', () => {
  it('drops the unsaved draft and closes the tab of a deleted calculation, and only of that one', () => {
    const doomed = openEditedCalculation('Doomed', null)
    const kept = openEditedCalculation('Kept', null)
    expect(actions.deleteCalculation(doomed).ok).toBe(true)
    expect(drafts.draftOf(doomed)).toBeUndefined()
    expect(openTabIds()).not.toContain(doomed)
    expect(drafts.draftOf(kept)).toBeDefined()
    expect(openTabIds()).toContain(kept)
  })

  it('drops the drafts and tabs of every calculation in a deleted folder, sub-folders included', () => {
    const folder = actions.createFolder('Old project', null)
    if (!folder.ok) throw new Error(folder.error)
    const sub = actions.createFolder('Rev A', folder.value)
    if (!sub.ok) throw new Error(sub.error)
    const inFolder = openEditedCalculation('Panel', folder.value)
    const inSub = openEditedCalculation('Skin', sub.value)
    const outside = openEditedCalculation('Elsewhere', null)
    expect(actions.deleteFolder(folder.value).ok).toBe(true)
    for (const id of [inFolder, inSub]) {
      expect(drafts.draftOf(id)).toBeUndefined()
      expect(openTabIds()).not.toContain(id)
    }
    expect(drafts.draftOf(outside)).toBeDefined()
    expect(openTabIds()).toContain(outside)
  })
})
