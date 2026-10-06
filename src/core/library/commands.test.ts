import { describe, expect, it } from 'vitest'
import { expectError, expectOk } from '../testing'
import {
  createCalculation, createFolder, deleteCalculation, deleteFolder, duplicateCalculation, moveCalculation, moveFolder,
  refreshSummary, renameCalculation, renameFolder, updateCalculation,
} from './commands'
import type { CalculationSummary } from './model'
import { findCalculation, findFolder } from './queries'
import { EMPTY, LIBRARY, T0 } from './testData'

const NOW = '2026-10-06T15:00:00'

const SUMMARY: CalculationSummary = { title: 'Ø25 H7/g6', status: 'pass', figures: [{ label: 'C', value: '7 … 41', unit: 'µm' }] }

describe('folders', () => {
  it('creates a folder at the top level or inside another', () => {
    const top = expectOk(createFolder(EMPTY, { id: 'a', name: '  Brakes ', parentId: null }, NOW))
    expect(top.folders).toEqual([{ id: 'a', name: 'Brakes', parentId: null, createdAt: NOW }])
    const nested = expectOk(createFolder(top, { id: 'b', name: 'Calipers', parentId: 'a' }, NOW))
    expect(findFolder(nested, 'b')?.parentId).toBe('a')
  })

  it('refuses a nameless folder, a missing parent and a taken id', () => {
    expect(expectError(createFolder(EMPTY, { id: 'a', name: ' ', parentId: null }, NOW))).toMatch(/name/)
    expect(expectError(createFolder(EMPTY, { id: 'a', name: 'X', parentId: 'gone' }, NOW))).toMatch(/no longer exists/)
    expect(expectError(createFolder(LIBRARY, { id: 'c-pin', name: 'X', parentId: null }, NOW))).toMatch(/in use/)
    expect(expectError(createFolder(EMPTY, { id: 'a', name: 'x'.repeat(81), parentId: null }, NOW))).toMatch(/80/)
  })

  it('renames a folder', () => {
    expect(findFolder(expectOk(renameFolder(LIBRARY, 'pins', 'Pins and bushes')), 'pins')?.name).toBe('Pins and bushes')
    expect(renameFolder(LIBRARY, 'gone', 'X').ok).toBe(false)
  })

  it('moves a folder with what it holds', () => {
    const moved = expectOk(moveFolder(LIBRARY, 'pins', 'skins'))
    expect(findFolder(moved, 'pins')?.parentId).toBe('skins')
    expect(findCalculation(moved, 'c-pin')?.folderId).toBe('pins')
    expect(findFolder(expectOk(moveFolder(LIBRARY, 'pins', null)), 'pins')?.parentId).toBeNull()
  })

  it('refuses to move a folder into itself or below itself', () => {
    expect(expectError(moveFolder(LIBRARY, 'upright', 'upright'))).toMatch(/into itself/)
    expect(expectError(moveFolder(LIBRARY, 'upright', 'pins'))).toMatch(/into itself/)
  })

  it('deletes a folder with its subfolders and calculations', () => {
    const library = expectOk(deleteFolder(LIBRARY, 'upright'))
    expect(library.folders.map((f) => f.id)).toEqual(['skins'])
    expect(library.calculations.map((c) => c.id)).toEqual(['c-top'])
    expect(deleteFolder(LIBRARY, 'gone').ok).toBe(false)
  })
})

describe('calculations', () => {
  it('creates a calculation with no inputs yet', () => {
    const library = expectOk(createCalculation(LIBRARY, { id: 'n', tool: 'lam', name: 'Skin', folderId: 'skins' }, NOW))
    expect(findCalculation(library, 'n')).toEqual({
      id: 'n', folderId: 'skins', tool: 'lam', name: 'Skin', inputs: null, summary: null, createdAt: NOW, updatedAt: NOW,
    })
  })

  it('refuses a nameless calculation or one in a missing folder', () => {
    expect(createCalculation(LIBRARY, { id: 'n', tool: 'fit', name: '', folderId: null }, NOW).ok).toBe(false)
    expect(createCalculation(LIBRARY, { id: 'n', tool: 'fit', name: 'X', folderId: 'gone' }, NOW).ok).toBe(false)
  })

  it('renames, moves and deletes a calculation', () => {
    expect(findCalculation(expectOk(renameCalculation(LIBRARY, 'c-top', ' Hub fit ')), 'c-top')?.name).toBe('Hub fit')
    expect(findCalculation(expectOk(moveCalculation(LIBRARY, 'c-top', 'skins')), 'c-top')?.folderId).toBe('skins')
    expect(findCalculation(expectOk(moveCalculation(LIBRARY, 'c-pin', null)), 'c-pin')?.folderId).toBeNull()
    expect(expectOk(deleteCalculation(LIBRARY, 'c-top')).calculations).toHaveLength(2)
    expect(expectError(moveCalculation(LIBRARY, 'c-top', 'gone'))).toMatch(/folder/)
    expect(expectError(deleteCalculation(LIBRARY, 'gone'))).toMatch(/calculation/)
  })

  it('duplicates a calculation beside the original', () => {
    const once = expectOk(duplicateCalculation(LIBRARY, 'c-pin', 'copy1', NOW))
    expect(findCalculation(once, 'copy1')).toMatchObject({ name: 'Pin fit copy', folderId: 'pins', inputs: { n: 1 }, createdAt: NOW })
    const twice = expectOk(duplicateCalculation(once, 'c-pin', 'copy2', NOW))
    expect(findCalculation(twice, 'copy2')?.name).toBe('Pin fit copy 2')
    expect(duplicateCalculation(LIBRARY, 'c-pin', 'c-top', NOW).ok).toBe(false)
  })

  it('records new inputs and their summary as an edit', () => {
    const library = expectOk(updateCalculation(LIBRARY, 'c-top', { inputs: { n: 2 }, summary: SUMMARY }, NOW))
    expect(findCalculation(library, 'c-top')).toMatchObject({ inputs: { n: 2 }, summary: SUMMARY, updatedAt: NOW, createdAt: T0 })
  })

  it('leaves the library untouched when nothing changed', () => {
    expect(expectOk(updateCalculation(LIBRARY, 'c-top', { inputs: { n: 1 }, summary: null }, NOW))).toBe(LIBRARY)
    expect(updateCalculation(LIBRARY, 'gone', { inputs: {}, summary: null }, NOW).ok).toBe(false)
  })

  it('refreshes a summary without counting it as an edit', () => {
    const library = expectOk(refreshSummary(LIBRARY, 'c-top', SUMMARY))
    expect(findCalculation(library, 'c-top')).toMatchObject({ summary: SUMMARY, updatedAt: T0 })
    expect(expectOk(refreshSummary(library, 'c-top', SUMMARY))).toBe(library)
  })
})
