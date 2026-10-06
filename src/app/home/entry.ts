// One row of a folder listing: a folder or a calculation.
import type { Calculation, Folder } from '../../core/library'

export type Entry = { kind: 'folder'; folder: Folder } | { kind: 'calculation'; calculation: Calculation }

export function entryName(entry: Entry): string {
  return entry.kind === 'folder' ? entry.folder.name : entry.calculation.name
}
