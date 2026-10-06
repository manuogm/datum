// Read-only questions asked of the library: what a folder holds, the path
// down to it, and the names offered for new calculations and copies.
import type { Calculation, CalculationSummary, Folder, Library, ToolId, ToolSnapshot } from './model'
import { TOOLS } from './tools'

/** Natural order, so "Fit 2" comes before "Fit 10". */
const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })

export function findFolder(library: Library, id: string): Folder | undefined {
  return library.folders.find((f) => f.id === id)
}

export function findCalculation(library: Library, id: string): Calculation | undefined {
  return library.calculations.find((c) => c.id === id)
}

/** The folders directly inside a folder (null = top level), by name. */
export function subfolders(library: Library, parentId: string | null): Folder[] {
  return library.folders.filter((f) => f.parentId === parentId).sort(byName)
}

/** The calculations directly inside a folder (null = top level), by name. */
export function calculationsIn(library: Library, folderId: string | null): Calculation[] {
  return library.calculations.filter((c) => c.folderId === folderId).sort(byName)
}

/** The folders from the top level down to this one, for the breadcrumb ([] for the top level). */
export function folderPath(library: Library, folderId: string | null): Folder[] {
  const path: Folder[] = []
  let folder = folderId === null ? undefined : findFolder(library, folderId)
  // The length guard stops a corrupt cycle from looping forever.
  while (folder && path.length <= library.folders.length) {
    path.unshift(folder)
    folder = folder.parentId === null ? undefined : findFolder(library, folder.parentId)
  }
  return path
}

/** The folder and every folder below it, at any depth. */
export function folderAndBelow(library: Library, folderId: string): Set<string> {
  const ids = new Set([folderId])
  for (let grew = true; grew; ) {
    grew = false
    for (const folder of library.folders) {
      if (folder.parentId !== null && ids.has(folder.parentId) && !ids.has(folder.id)) {
        ids.add(folder.id)
        grew = true
      }
    }
  }
  return ids
}

/** Everything a folder holds, at any depth: what deleting it would delete. */
export function folderContents(library: Library, folderId: string): { folders: number; calculations: number } {
  const ids = folderAndBelow(library, folderId)
  return {
    folders: ids.size - 1,
    calculations: library.calculations.filter((c) => c.folderId !== null && ids.has(c.folderId)).length,
  }
}

/** The name offered for a new calculation: "Fit 1", or the next number free in that folder. */
export function defaultCalculationName(library: Library, folderId: string | null, tool: ToolId): string {
  const taken = new Set(calculationsIn(library, folderId).map((c) => c.name.toLowerCase()))
  const base = TOOLS[tool].shortName
  let n = 1
  while (taken.has(`${base} ${n}`.toLowerCase())) n++
  return `${base} ${n}`
}

/** The name of a copy: "Bracket fit copy", then "Bracket fit copy 2" … */
export function copyName(name: string, taken: readonly string[]): string {
  const names = new Set(taken.map((t) => t.toLowerCase()))
  let candidate = `${name} copy`
  for (let n = 2; names.has(candidate.toLowerCase()); n++) candidate = `${name} copy ${n}`
  return candidate
}

/** What a folder lists about a tool's result: its title, status and first three figures. */
export function summaryOf(snapshot: ToolSnapshot): CalculationSummary {
  return { title: snapshot.title, status: snapshot.status, figures: snapshot.figures.slice(0, 3) }
}
