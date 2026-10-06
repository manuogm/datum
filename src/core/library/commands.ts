// Every change to the library, as pure functions: each takes the current
// library and returns the new one (or a plain-English reason why it cannot be
// done). Ids and the time are passed in, so the results are predictable;
// nothing here touches storage (the app's library store persists the result).
import { fail, ok, type Result } from '../result'
import type { Calculation, CalculationSummary, Library, ToolId } from './model'
import { copyName, findCalculation, findFolder, folderAndBelow } from './queries'

/** Longest name accepted, so a name always fits a tab and a list row. */
export const MAX_NAME_LENGTH = 80

function checkName(name: string, what: 'folder' | 'calculation'): Result<string> {
  const trimmed = name.trim()
  if (!trimmed) return fail(`Give the ${what} a name.`)
  if (trimmed.length > MAX_NAME_LENGTH) return fail(`Keep the name under ${MAX_NAME_LENGTH} characters.`)
  return ok(trimmed)
}

/** A folder to put something in: null (top level) or one that exists. */
function checkParent(library: Library, folderId: string | null): Result<string | null> {
  if (folderId !== null && !findFolder(library, folderId)) return fail('That folder no longer exists.')
  return ok(folderId)
}

function checkNewId(library: Library, id: string): Result<string> {
  const taken = library.folders.some((f) => f.id === id) || library.calculations.some((c) => c.id === id)
  return taken ? fail(`The id ${id} is already in use.`) : ok(id)
}

function withCalculation(
  library: Library,
  id: string,
  change: (calculation: Calculation) => Result<Calculation>,
): Result<Library> {
  const calculation = findCalculation(library, id)
  if (!calculation) return fail('That calculation no longer exists.')
  const changed = change(calculation)
  if (!changed.ok) return changed
  return ok({ ...library, calculations: library.calculations.map((c) => (c.id === id ? changed.value : c)) })
}

// Folders

export function createFolder(
  library: Library,
  folder: { id: string; name: string; parentId: string | null },
  now: string,
): Result<Library> {
  const id = checkNewId(library, folder.id)
  if (!id.ok) return id
  const name = checkName(folder.name, 'folder')
  if (!name.ok) return name
  const parent = checkParent(library, folder.parentId)
  if (!parent.ok) return parent
  const created = { id: id.value, name: name.value, parentId: parent.value, createdAt: now }
  return ok({ ...library, folders: [...library.folders, created] })
}

export function renameFolder(library: Library, id: string, newName: string): Result<Library> {
  if (!findFolder(library, id)) return fail('That folder no longer exists.')
  const name = checkName(newName, 'folder')
  if (!name.ok) return name
  return ok({ ...library, folders: library.folders.map((f) => (f.id === id ? { ...f, name: name.value } : f)) })
}

/** Moves a folder, with everything in it, into another folder (null = top level). */
export function moveFolder(library: Library, id: string, parentId: string | null): Result<Library> {
  if (!findFolder(library, id)) return fail('That folder no longer exists.')
  const parent = checkParent(library, parentId)
  if (!parent.ok) return parent
  if (parentId !== null && folderAndBelow(library, id).has(parentId)) {
    return fail('A folder cannot be moved into itself or into a folder inside it.')
  }
  return ok({ ...library, folders: library.folders.map((f) => (f.id === id ? { ...f, parentId } : f)) })
}

/** Deletes a folder and everything inside it: subfolders and calculations. */
export function deleteFolder(library: Library, id: string): Result<Library> {
  if (!findFolder(library, id)) return fail('That folder no longer exists.')
  const doomed = folderAndBelow(library, id)
  return ok({
    folders: library.folders.filter((f) => !doomed.has(f.id)),
    calculations: library.calculations.filter((c) => c.folderId === null || !doomed.has(c.folderId)),
  })
}

// Calculations

/** A new calculation, stored straight away with its starting inputs (the tool's example). */
export function createCalculation(
  library: Library,
  calculation: {
    id: string
    tool: ToolId
    name: string
    folderId: string | null
    inputs: unknown
    summary: CalculationSummary | null
  },
  now: string,
): Result<Library> {
  const id = checkNewId(library, calculation.id)
  if (!id.ok) return id
  const name = checkName(calculation.name, 'calculation')
  if (!name.ok) return name
  const folder = checkParent(library, calculation.folderId)
  if (!folder.ok) return folder
  const created: Calculation = {
    id: id.value,
    folderId: folder.value,
    tool: calculation.tool,
    name: name.value,
    inputs: calculation.inputs,
    summary: calculation.summary,
    createdAt: now,
    updatedAt: now,
  }
  return ok({ ...library, calculations: [...library.calculations, created] })
}

export function renameCalculation(library: Library, id: string, newName: string): Result<Library> {
  const name = checkName(newName, 'calculation')
  if (!name.ok) return name
  return withCalculation(library, id, (c) => ok({ ...c, name: name.value }))
}

/** Copies a calculation into the same folder as "<name> copy". */
export function duplicateCalculation(library: Library, id: string, newId: string, now: string): Result<Library> {
  const original = findCalculation(library, id)
  if (!original) return fail('That calculation no longer exists.')
  const checkedId = checkNewId(library, newId)
  if (!checkedId.ok) return checkedId
  const siblings = library.calculations.filter((c) => c.folderId === original.folderId).map((c) => c.name)
  const name = copyName(original.name, siblings).slice(0, MAX_NAME_LENGTH)
  const copy: Calculation = { ...original, id: checkedId.value, name, createdAt: now, updatedAt: now }
  return ok({ ...library, calculations: [...library.calculations, copy] })
}

export function moveCalculation(library: Library, id: string, folderId: string | null): Result<Library> {
  const folder = checkParent(library, folderId)
  if (!folder.ok) return folder
  return withCalculation(library, id, (c) => ok({ ...c, folderId: folder.value }))
}

export function deleteCalculation(library: Library, id: string): Result<Library> {
  if (!findCalculation(library, id)) return fail('That calculation no longer exists.')
  return ok({ ...library, calculations: library.calculations.filter((c) => c.id !== id) })
}

/**
 * Saves new inputs and the result they give, over the stored ones. Returns
 * the same library object when nothing changed, so callers can skip writing.
 */
export function updateCalculation(
  library: Library,
  id: string,
  change: { inputs: unknown; summary: CalculationSummary | null },
  now: string,
): Result<Library> {
  const current = findCalculation(library, id)
  if (!current) return fail('That calculation no longer exists.')
  if (sameJson(current.inputs, change.inputs) && sameJson(current.summary, change.summary)) return ok(library)
  return withCalculation(library, id, (c) => ok({ ...c, inputs: change.inputs, summary: change.summary, updatedAt: now }))
}

/**
 * Brings a stored summary in line with what the tool now computes for the
 * same inputs (e.g. after an engine fix). Not an edit: the time is kept. Returns
 * the same library object when the summary already matches.
 */
export function refreshSummary(library: Library, id: string, summary: CalculationSummary | null): Result<Library> {
  const current = findCalculation(library, id)
  if (!current) return fail('That calculation no longer exists.')
  if (sameJson(current.summary, summary)) return ok(library)
  return withCalculation(library, id, (c) => ok({ ...c, summary }))
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}
