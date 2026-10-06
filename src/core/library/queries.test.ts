import { describe, expect, it } from 'vitest'
import type { Library, ToolSnapshot } from './model'
import {
  calculationsIn, copyName, defaultCalculationName, folderAndBelow, folderContents, folderPath, subfolders, summaryOf,
} from './queries'
import { EMPTY, LIBRARY } from './testData'

describe('folder listings', () => {
  it('lists folders and calculations directly inside a folder, by name', () => {
    expect(subfolders(LIBRARY, null).map((f) => f.name)).toEqual(['Rear upright', 'Skins'])
    expect(subfolders(LIBRARY, 'upright').map((f) => f.id)).toEqual(['pins'])
    expect(calculationsIn(LIBRARY, null).map((c) => c.id)).toEqual(['c-top'])
    expect(calculationsIn(LIBRARY, 'upright').map((c) => c.id)).toEqual(['c-bolt'])
  })

  it('sorts numbers in names naturally', () => {
    const library: Library = {
      folders: [],
      calculations: ['Fit 10', 'Fit 2', 'fit 1'].map((name, i) => ({ ...LIBRARY.calculations[2], id: String(i), name })),
    }
    expect(calculationsIn(library, null).map((c) => c.name)).toEqual(['fit 1', 'Fit 2', 'Fit 10'])
  })

  it('gives the path from the top level down to a folder', () => {
    expect(folderPath(LIBRARY, 'pins').map((f) => f.id)).toEqual(['upright', 'pins'])
    expect(folderPath(LIBRARY, null)).toEqual([])
    expect(folderPath(LIBRARY, 'gone')).toEqual([])
  })

  it('survives a folder cycle in corrupt data', () => {
    const cyclic: Library = {
      folders: [
        { id: 'a', name: 'A', parentId: 'b', createdAt: '' },
        { id: 'b', name: 'B', parentId: 'a', createdAt: '' },
      ],
      calculations: [],
    }
    expect(folderPath(cyclic, 'a').length).toBeLessThanOrEqual(3)
  })

  it('counts what a folder holds at any depth', () => {
    expect([...folderAndBelow(LIBRARY, 'upright')].sort()).toEqual(['pins', 'upright'])
    expect(folderContents(LIBRARY, 'upright')).toEqual({ folders: 1, calculations: 2 })
    expect(folderContents(LIBRARY, 'skins')).toEqual({ folders: 0, calculations: 0 })
  })
})

describe('names', () => {
  it('offers the next free number for a new calculation in that folder', () => {
    expect(defaultCalculationName(EMPTY, null, 'fit')).toBe('Fit 1')
    expect(defaultCalculationName(LIBRARY, null, 'fit')).toBe('Fit 2')
    expect(defaultCalculationName(LIBRARY, 'pins', 'fit')).toBe('Fit 1')
    expect(defaultCalculationName(LIBRARY, 'upright', 'bolt')).toBe('Bolt 2')
    expect(defaultCalculationName(LIBRARY, null, 'lam')).toBe('Laminate 1')
  })

  it('names copies so they stand apart', () => {
    expect(copyName('Pin', ['Pin'])).toBe('Pin copy')
    expect(copyName('Pin', ['Pin', 'pin copy'])).toBe('Pin copy 2')
    expect(copyName('Pin', ['Pin copy', 'Pin copy 2'])).toBe('Pin copy 3')
  })
})

describe('summaryOf', () => {
  it('keeps the title, the status and the first three figures', () => {
    const figure = (label: string) => ({ label, value: '1' })
    const snapshot: ToolSnapshot = {
      tool: 'bolt', title: 'M10', status: 'fail', inputs: {}, figures: ['a', 'b', 'c', 'd'].map(figure),
    }
    expect(summaryOf(snapshot)).toEqual({ title: 'M10', status: 'fail', figures: ['a', 'b', 'c'].map(figure) })
  })
})
