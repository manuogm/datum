// The open calculation tabs as a list of calculation ids, left to right, and
// what changes when one opens or closes. Pure, so it is tested on its own.

/** Adds a tab at the right end, unless it is already open. */
export function withTab(tabs: readonly string[], id: string): readonly string[] {
  return tabs.includes(id) ? tabs : [...tabs, id]
}

export function withoutTab(tabs: readonly string[], id: string): readonly string[] {
  return tabs.filter((tab) => tab !== id)
}

/**
 * The tab to show after closing `id` while it is the one shown: its right
 * neighbour, else its left one; null when no tab is left (show Home).
 */
export function tabAfterClosing(tabs: readonly string[], id: string): string | null {
  const index = tabs.indexOf(id)
  if (index === -1) return null
  return tabs[index + 1] ?? tabs[index - 1] ?? null
}

/** Reads a stored tab list; anything malformed reads as no tabs. */
export function parseTabs(raw: string | null): readonly string[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]')
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string'))] : []
  } catch {
    return []
  }
}
