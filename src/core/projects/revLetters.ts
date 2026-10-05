// Revision letters, as on drawings: A, B, C … then AA, AB … Following
// ASME Y14.35, the letters I, O, Q, S, X and Z are skipped because they are
// easily mistaken for numbers (1, 0, 5, 2) or for markup.

const LETTERS = 'ABCDEFGHJKLMNPRTUVWY'

/** The letter of the n-th revision, counting from 0: 0 → "A", 19 → "Y", 20 → "AA". */
export function revLetter(index: number): string {
  if (!Number.isInteger(index) || index < 0) throw new RangeError(`Invalid revision index ${index}`)
  let n = index
  let letters = ''
  do {
    letters = LETTERS[n % LETTERS.length] + letters
    n = Math.floor(n / LETTERS.length) - 1
  } while (n >= 0)
  return letters
}
