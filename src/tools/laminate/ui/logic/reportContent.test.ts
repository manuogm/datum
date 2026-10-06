import { describe, expect, it } from 'vitest'
import { expectOk } from '../../../../core/testing'
import { DEFAULT_LAMINATE_INPUTS, NO_LOADS, pliesAt } from '../state/lamInputs'
import { analyse } from './lamResults'
import { laminateFacts, laminateWarnings, plyRows, unitsLine } from './reportContent'

const analysisOf = (changes: Partial<typeof DEFAULT_LAMINATE_INPUTS> = {}) => expectOk(analyse({ ...DEFAULT_LAMINATE_INPUTS, ...changes }))

describe('laminate report content', () => {
  it('lists the layup, the applied loads only, and the criterion', () => {
    const facts = laminateFacts(DEFAULT_LAMINATE_INPUTS, analysisOf(), 'si')
    expect(facts.map((f) => f.label)).toEqual(['Layup', 'Plies', 'Material', 'Thickness h', 'Areal mass', 'Symmetric · balanced', 'Nx', 'Nxy', 'Criterion', 'Target RF'])
    expect(facts.find((f) => f.label === 'Nx')?.value).toBe('250.0 N/mm')
    expect(facts.find((f) => f.label === 'Criterion')?.value).toBe('Tsai-Wu, F12* −0.5')
  })

  it('warns about the target, the failing plies and couplings', () => {
    expect(laminateWarnings(analysisOf())).toEqual(['RF 1.26 is below the target of 1.50.'])
    const unsymmetric = laminateWarnings(analysisOf({ plies: pliesAt([0, 90]), loads: { ...NO_LOADS, nxNPerMm: 1 } }))
    expect(unsymmetric).toHaveLength(1)
    expect(unsymmetric[0]).toMatch(/^Bending–extension coupling \(B ≠ 0\)/)
    expect(laminateWarnings(analysisOf({ plies: pliesAt([45, 0, 0, 45]) }))[1]).toMatch(/^Shear–extension coupling/)
    // Bend–twist alone (a standard quasi-isotropic layup) is no warning.
    expect(analysisOf().coupling.bendTwist).toBe(true)
    expect(laminateWarnings(analysisOf({ loads: NO_LOADS }))).toEqual(['No load is applied: first-ply failure is not checked.'])
  })

  it('reads the couplings from the engine, not from the stacking words', () => {
    const analysis = analysisOf()
    expect(laminateWarnings({ ...analysis, coupling: { ...analysis.coupling, bendingExtension: true } })[1]).toMatch(/^Bending–extension/)
  })

  it('words a failing ply by what the criterion can state', () => {
    const failing = { plies: pliesAt([0, 90, 90, 0]) }
    expect(laminateWarnings(analysisOf(failing))[0]).toMatch(/fail \(dominant stress: [a-z -]+\) under the applied loads/)
    expect(laminateWarnings(analysisOf({ ...failing, criterion: 'max-stress' }))[0]).toMatch(/fail in [a-z -]+ under the applied loads/)
  })

  it('reports each ply at its critical face', () => {
    const rows = plyRows(analysisOf(), 'si')
    expect(rows).toHaveLength(8)
    expect(rows[3]).toMatchObject({ index: 4, angle: '90°', critical: true, mode: 'matrix tension', reserveFactor: '1.26' })
    expect(rows[3].stresses).toHaveLength(3)
  })

  it('names the units', () => {
    expect(unitsLine('si')).toBe('SI (mm, N/mm, N·mm/mm, MPa, GPa)')
  })
})
