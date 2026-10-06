// A small library for the tests: two top-level folders, one nested folder,
// and calculations at the top level and in folders.
import type { Calculation, Library, ToolId } from './model'

export const T0 = '2026-10-01T09:00:00'

export const EMPTY: Library = { folders: [], calculations: [] }

function calc(id: string, folderId: string | null, tool: ToolId, name: string): Calculation {
  return { id, folderId, tool, name, inputs: { n: 1 }, summary: null, createdAt: T0, updatedAt: T0 }
}

/**
 *   upright/          (folder)
 *     pins/           (folder)
 *       pin fit       fit
 *     Bolt 1          bolt
 *   skins/            (folder)
 *   Fit 1             fit (top level)
 */
export const LIBRARY: Library = {
  folders: [
    { id: 'upright', name: 'Rear upright', parentId: null, createdAt: T0 },
    { id: 'pins', name: 'Pins', parentId: 'upright', createdAt: T0 },
    { id: 'skins', name: 'Skins', parentId: null, createdAt: T0 },
  ],
  calculations: [
    calc('c-pin', 'pins', 'fit', 'Pin fit'),
    calc('c-bolt', 'upright', 'bolt', 'Bolt 1'),
    calc('c-top', null, 'fit', 'Fit 1'),
  ],
}
