/** Whether a tolerance zone belongs to a hole (internal feature) or a shaft (external feature). */
export type ZoneKind = 'hole' | 'shaft'

/**
 * Fundamental deviation letters (ISO 286-1:2010, position of the tolerance zone), written in
 * lower case. Shafts use them as-is (g, k …); holes use the upper-case form
 * (G, K …). cd, ef and fg are the intermediate positions used mainly in fine
 * mechanics.
 */
export const DEVIATION_LETTERS = [
  'a', 'b', 'c', 'cd', 'd', 'e', 'ef', 'f', 'fg', 'g', 'h', 'js', 'j',
  'k', 'm', 'n', 'p', 'r', 's', 't', 'u', 'v', 'x', 'y', 'z', 'za', 'zb', 'zc',
] as const

export type DeviationLetter = (typeof DEVIATION_LETTERS)[number]

export function isDeviationLetter(text: string): text is DeviationLetter {
  return (DEVIATION_LETTERS as readonly string[]).includes(text)
}

/** The letter as written in a designation: upper case for holes ('JS'), lower case for shafts ('js'). */
export function letterSymbol(kind: ZoneKind, letter: DeviationLetter): string {
  return kind === 'hole' ? letter.toUpperCase() : letter
}
