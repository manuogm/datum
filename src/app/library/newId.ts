// Ids for new folders and calculations: short random strings, so ids made in
// two browser tabs at once do not collide, and a deleted calculation's id is
// never handed out again (an old tab or link to it then finds nothing).
import type { Library } from '../../core/library'

export function newId(library: Library): string {
  const taken = new Set([...library.folders.map((f) => f.id), ...library.calculations.map((c) => c.id)])
  let id: string
  do {
    id = Math.random().toString(36).slice(2, 10)
  } while (id.length < 8 || taken.has(id))
  return id
}
