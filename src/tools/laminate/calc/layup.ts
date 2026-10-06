import { fail, ok, type Result } from '../../../core/result'
import { MAX_PLIES } from './rules'
import type { Ply, PlyMaterial } from './types'

/**
 * Stacking-sequence notation (Jones 1999 §4.5; Daniel & Ishai 2006 §8.2):
 * angles from the top ply down between brackets, separated by "/".
 *   ±45      a +45/−45 pair (∓45: −45/+45)
 *   0₂, 0_2  a ply repeated: 0/0;  (±45)₂ or (0/90)2: a group repeated
 *   ]s       the sequence followed by its mirror image (symmetric)
 *   ]2s      the sequence twice, then mirrored; ]2 twice; ]T or ] as written
 * "-", "−" and "+" signs and spaces are accepted. Angles are reduced to the
 * range −90° < θ ≤ 90° (so −90 reads as 90 and 135 as −45).
 */

const SUBSCRIPT_DIGITS = '₀₁₂₃₄₅₆₇₈₉'

/** θ reduced to −90° < θ ≤ 90°: a ply at θ and θ ± 180° is the same ply. */
export function normaliseAngleDeg(angleDeg: number): number {
  const reduced = ((angleDeg % 180) + 180) % 180
  const angle = reduced > 90 ? reduced - 180 : reduced
  return angle === 0 ? 0 : angle // no −0
}

/** Reads the notation left to right; every method returns Result instead of throwing. */
class LayupReader {
  private position = 0
  private readonly text: string

  constructor(text: string) {
    this.text = text.replace(/\s+/g, '')
  }

  read(): Result<readonly number[]> {
    if (this.text === '') return fail('Enter a stacking sequence, for example [0/±45/90]s.')
    const bracketed = this.text.startsWith('[')
    if (bracketed) this.position++
    const sequence = this.sequence()
    if (!sequence.ok) return sequence
    if (bracketed && !this.take(']')) return this.unexpected('"]" to close the sequence')
    const expanded = bracketed ? this.suffix(sequence.value) : ok(sequence.value)
    if (!expanded.ok) return expanded
    if (this.position < this.text.length) return this.unexpected('the end of the sequence')
    return expanded
  }

  private sequence(): Result<number[]> {
    const angles: number[] = []
    do {
      const item = this.item()
      if (!item.ok) return item
      angles.push(...item.value)
      if (angles.length > MAX_PLIES) return tooMany()
    } while (this.take('/'))
    return ok(angles)
  }

  /** An angle, a ±/∓ pair or a bracketed group, with an optional repeat count. */
  private item(): Result<number[]> {
    if (this.take('(')) {
      const group = this.sequence()
      if (!group.ok) return group
      if (!this.take(')')) return this.unexpected('")" to close the group')
      return repeat(group.value, this.count(true))
    }
    const sign = this.peek()
    const pair = sign === '±' ? 1 : sign === '∓' ? -1 : 0
    const factor = sign === '-' || sign === '−' ? -1 : 1
    if (sign !== '' && '±∓+-−'.includes(sign)) this.position++
    const digits = /^\d+(\.\d+)?/.exec(this.text.slice(this.position))
    if (!digits) return this.unexpected('a ply angle')
    this.position += digits[0].length
    const angleDeg = Number(digits[0])
    const plies = pair === 0 ? [factor * angleDeg] : [pair * angleDeg, -pair * angleDeg]
    return repeat(plies.map(normaliseAngleDeg), this.count(false))
  }

  /** A repeat count: subscript digits, "_k", or (after a group) plain digits. 1 when there is none. */
  private count(plainDigitsAllowed: boolean): number {
    const rest = this.text.slice(this.position)
    const subscript = new RegExp(`^[${SUBSCRIPT_DIGITS}]+`).exec(rest)
    if (subscript) {
      this.position += subscript[0].length
      return Number([...subscript[0]].map((digit) => SUBSCRIPT_DIGITS.indexOf(digit)).join(''))
    }
    const plain = (plainDigitsAllowed ? /^_?(\d+)/ : /^_(\d+)/).exec(rest)
    if (!plain) return 1
    this.position += plain[0].length
    return Number(plain[1])
  }

  /** After "]": an optional repeat count, then "s" (mirror) or "T" (as written). */
  private suffix(angles: readonly number[]): Result<readonly number[]> {
    const repeated = repeat(angles, this.count(true))
    if (!repeated.ok) return repeated
    if (this.take('s') || this.take('S')) return repeated.value.length * 2 > MAX_PLIES ? tooMany() : ok([...repeated.value, ...[...repeated.value].reverse()])
    this.take('T')
    return repeated
  }

  private peek(): string {
    return this.text.charAt(this.position)
  }

  private take(character: string): boolean {
    if (this.peek() !== character) return false
    this.position++
    return true
  }

  private unexpected(expected: string): Result<never> {
    const found = this.position < this.text.length ? `"${this.peek()}"` : 'the end'
    return fail(`Expected ${expected} at character ${this.position + 1} of "${this.text}", found ${found}.`)
  }
}

const tooMany = () => fail(`The sequence has more than ${MAX_PLIES} plies.`)

function repeat(angles: readonly number[], times: number): Result<number[]> {
  if (!(times >= 1)) return fail('A repeat count must be 1 or more.')
  if (angles.length * times > MAX_PLIES) return tooMany()
  return ok(Array.from({ length: times }, () => angles).flat())
}

/** Ply angles, top ply first, from stacking-sequence notation such as "[0/±45/90]s" or "[0/45/-45/90]2s". */
export function parseLayup(notation: string): Result<readonly number[]> {
  return new LayupReader(notation).read()
}

// ── Formatting ───────────────────────────────────────────────────────────

const angleText = (angleDeg: number) => (angleDeg < 0 ? `−${-angleDeg}` : `${angleDeg}`)
const subscript = (count: number) => (count > 1 ? [...String(count)].map((digit) => SUBSCRIPT_DIGITS[Number(digit)]).join('') : '')
const sameAngles = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((angle, i) => angle === b[i])

/** The shortest block that the angles repeat whole; returns the block and how many times it repeats. */
function smallestPeriod(angles: readonly number[]): { readonly block: readonly number[]; readonly times: number } {
  for (let length = 1; length < angles.length; length++) {
    if (angles.length % length !== 0) continue
    const block = angles.slice(0, length)
    if (angles.every((angle, i) => angle === block[i % length])) return { block, times: angles.length / length }
  }
  return { block: angles, times: 1 }
}

/** Tokens such as "0₂", "±45", "(±45)₂", "90", reading left to right and taking pairs before runs. */
function compress(angles: readonly number[]): string[] {
  const tokens: string[] = []
  let i = 0
  while (i < angles.length) {
    const angle = angles[i]
    const isPair = angle !== 0 && angle !== 90 && angles[i + 1] === -angle
    const step = isPair ? 2 : 1
    let count = 1
    while (sameAngles(angles.slice(i + count * step, i + (count + 1) * step), angles.slice(i, i + step))) count++
    const text = isPair ? `${angle > 0 ? '±' : '∓'}${Math.abs(angle)}` : angleText(angle)
    tokens.push(isPair && count > 1 ? `(${text})${subscript(count)}` : `${text}${subscript(count)}`)
    i += count * step
  }
  return tokens
}

/**
 * Compact notation for ply angles listed top ply first: "[0/±45/90]s",
 * "[0/±45/90]2s", "[0₂/±45]s"; a stack that is not symmetric is written out
 * as "[0/90]" (or "[0/90]3" when a block repeats). parseLayup reads it back.
 */
export function formatLayup(anglesDeg: readonly number[]): string {
  const angles = anglesDeg.map(normaliseAngleDeg)
  const half = angles.slice(0, angles.length / 2)
  const symmetric = angles.length > 0 && angles.length % 2 === 0 && sameAngles(half, [...angles.slice(angles.length / 2)].reverse())
  const { block, times } = smallestPeriod(symmetric ? half : angles)
  return `[${compress(block).join('/')}]${times > 1 ? times : ''}${symmetric ? 's' : ''}`
}

// ── Plies ────────────────────────────────────────────────────────────────

/** The ply's thickness: its own, or the cured ply thickness of its material. */
export const plyThicknessMm = (ply: Ply) => ply.thicknessMm ?? ply.material.lamina.plyThicknessMm

/** Plies of one material at the given angles (top ply first). */
export function pliesOf(material: PlyMaterial, anglesDeg: readonly number[], thicknessMm?: number): readonly Ply[] {
  return anglesDeg.map((angleDeg) => ({ material, angleDeg, thicknessMm }))
}

const ANGLE_TOLERANCE_DEG = 1e-9
const sameAngle = (a: number, b: number) => Math.abs(normaliseAngleDeg(a) - normaliseAngleDeg(b)) < ANGLE_TOLERANCE_DEG

/** Ply k and ply n + 1 − k have the same material, angle and thickness (Jones §4.5.1). */
export function isSymmetric(plies: readonly Ply[]): boolean {
  return plies.every((ply, i) => {
    const mirror = plies[plies.length - 1 - i]
    return ply.material.id === mirror.material.id && sameAngle(ply.angleDeg, mirror.angleDeg)
      && plyThicknessMm(ply) === plyThicknessMm(mirror)
  })
}

/**
 * Balanced: for every material and thickness, as many plies at +θ as at −θ
 * for each θ other than 0° and 90°, so that A16 = A26 = 0 (Jones §4.5.2).
 */
export function isBalanced(plies: readonly Ply[]): boolean {
  const net = new Map<string, number>()
  for (const ply of plies) {
    const angle = normaliseAngleDeg(ply.angleDeg)
    if (sameAngle(angle, 0) || sameAngle(angle, 90)) continue
    const key = `${ply.material.id}|${plyThicknessMm(ply)}|${Math.abs(angle)}`
    net.set(key, (net.get(key) ?? 0) + Math.sign(angle))
  }
  return [...net.values()].every((count) => count === 0)
}
