import { describe, expect, it } from 'vitest'
import { materialById } from '../../../core/materials'
import { expectError, expectOk } from '../../../core/testing'
import { formatLayup, isBalanced, isSymmetric, normaliseAngleDeg, parseLayup, plyMaterial, pliesOf } from '.'

describe('parseLayup', () => {
  it.each<[string, readonly number[]]>([
    ['[0/±45/90]s', [0, 45, -45, 90, 90, -45, 45, 0]],
    ['[0/45/-45/90]2s', [0, 45, -45, 90, 0, 45, -45, 90, 90, -45, 45, 0, 90, -45, 45, 0]],
    ['[0₂/±45]s', [0, 0, 45, -45, -45, 45, 0, 0]],
    ['[0_2/∓45]s', [0, 0, -45, 45, 45, -45, 0, 0]],
    ['[(0/90)2]', [0, 90, 0, 90]],
    ['[(±45)₂/0]T', [45, -45, 45, -45, 0]],
    ['[0/90]3', [0, 90, 0, 90, 0, 90]],
    [' [ +30 / −30 / 90 ] S ', [30, -30, 90, 90, -30, 30]],
    ['0/90/0', [0, 90, 0]],
    ['[-90/135/22.5]', [90, -45, 22.5]],
  ])('%s', (text, angles) => {
    expect(expectOk(parseLayup(text))).toEqual(angles)
  })

  it.each([
    ['', /Enter/], ['[0/45', /"\]"/], ['[0//90]', /ply angle/], ['[0/abc]', /ply angle/], ['[(0/90]', /"\)"/],
    ['[0]s2', /end of the sequence/], ['[0₀]', /1 or more/], ['[0]999s', /more than 400/], ['[(0/90)300]', /more than 400/],
  ])('rejects "%s"', (text, message) => {
    expect(expectError(parseLayup(text))).toMatch(message)
  })
})

describe('formatLayup', () => {
  it.each<[readonly number[], string]>([
    [[0, 45, -45, 90, 90, -45, 45, 0], '[0/±45/90]s'],
    [[0, 0, 45, -45, -45, 45, 0, 0], '[0₂/±45]s'],
    [[0, 45, -45, 90, 0, 45, -45, 90, 90, -45, 45, 0, 90, -45, 45, 0], '[0/±45/90]2s'],
    [[45, -45, 45, -45, 0], '[(±45)₂/0]'],
    [[-45, 45, 0, 0, 45, -45], '[∓45/0]s'],
    [[0, 90], '[0/90]'],
    [[0, 90, 0, 90, 0, 90], '[0/90]3'],
    [[0, 90, 0], '[0/90/0]'],
    [[-30, 270], '[−30/90]'],
  ])('%j → %s', (angles, text) => {
    expect(formatLayup(angles)).toBe(text)
  })

  it.each(['[0/±45/90]s', '[0/45/-45/90]2s', '[(±45)₂/0₃/90]s', '[30/-60/0]', '[90₂/0/±45]3s'])('round-trips %s', (text) => {
    const angles = expectOk(parseLayup(text))
    expect(expectOk(parseLayup(formatLayup(angles)))).toEqual(angles)
  })

  it('normalises angles to −90° < θ ≤ 90°', () => {
    expect([-90, 180, 135, -135, 450, -0].map(normaliseAngleDeg)).toEqual([90, 0, -45, 45, 90, 0])
  })
})

describe('symmetric and balanced', () => {
  const t700 = expectOk(plyMaterial(expectOk(materialById('cfrp-t700-m21-ud'))))
  const glass = expectOk(plyMaterial(expectOk(materialById('gfrp-e-glass-epoxy-ud'))))
  const plies = (layup: string) => pliesOf(t700, expectOk(parseLayup(layup)))

  it.each<[string, boolean, boolean]>([
    ['[0/±45/90]s', true, true],
    ['[45/-45]', false, true],
    ['[45]s', true, false],
    ['[0/30/-60]s', true, false],
    ['[0/90]', false, true],
  ])('%s: symmetric %s, balanced %s', (layup, symmetric, balanced) => {
    expect(isSymmetric(plies(layup))).toBe(symmetric)
    expect(isBalanced(plies(layup))).toBe(balanced)
  })

  it('takes material and thickness into account', () => {
    const hybrid = [{ material: t700, angleDeg: 45 }, { material: glass, angleDeg: -45 }]
    expect(isBalanced(hybrid)).toBe(false)
    expect(isSymmetric([{ material: t700, angleDeg: 0 }, { material: glass, angleDeg: 0 }])).toBe(false)
    expect(isSymmetric([{ material: t700, angleDeg: 0, thicknessMm: 0.2 }, { material: t700, angleDeg: 0 }])).toBe(false)
  })
})
