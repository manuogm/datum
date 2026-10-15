// Which calculations link which: an Assembly stack lists the saved Part
// stacks it uses by their calculation id. The library, Home and the delete
// dialog ask this of the stored inputs without loading the tool, so this
// reads them loosely and imports nothing but types.
import type { Calculation, Library } from '../../../../core/library'

/** The ids of the Part stacks a stored Assembly stack links (none for any other calculation). */
export function linkedPartIds(calculation: Pick<Calculation, 'tool' | 'inputs'>): string[] {
  if (calculation.tool !== 'stack') return []
  const inputs = calculation.inputs as { mode?: unknown; rows?: unknown } | null
  if (!inputs || inputs.mode !== 'assembly' || !Array.isArray(inputs.rows)) return []
  return inputs.rows.flatMap((row: unknown) => {
    const linked = row as { kind?: unknown; calcId?: unknown } | null
    return linked?.kind === 'linked' && typeof linked.calcId === 'string' ? [linked.calcId] : []
  })
}

/** The assemblies that link any of these calculations, apart from the calculations themselves. */
export function assembliesLinking(library: Library, ids: Iterable<string>): Calculation[] {
  const targets = new Set(ids)
  return library.calculations.filter((c) => !targets.has(c.id) && linkedPartIds(c).some((id) => targets.has(id)))
}
