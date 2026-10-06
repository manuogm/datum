import { describe, expect, it } from 'vitest'
import { expectOk } from '../../../../core/testing'
import { DEFAULT_LAMINATE_INPUTS, NO_LOADS, pliesAt } from '../state/lamInputs'
import { analyse } from './lamResults'
import { abdMatrices, constantViews, COUPLING_FLAGS, formatTerm } from './stiffness'

const analysis = expectOk(analyse(DEFAULT_LAMINATE_INPUTS))

describe('abdMatrices', () => {
  it('shows A in kN/mm, B in kN and D in N·m', () => {
    const [a, b, d] = abdMatrices(analysis.stiffness, analysis.layup.thicknessMm, 'si')
    expect([a.unit, b.unit, d.unit]).toEqual(['kN/mm', 'kN', 'N·m'])
    expect(a.rows[0][0]).toBe((analysis.stiffness.aNPerMm[0][0] / 1000).toFixed(1))
    expect(b.rows.flat().every((v) => v === '0')).toBe(true)
  })

  it('never shows a term the engine counts as a coupling as 0', () => {
    const unsymmetric = expectOk(analyse({ ...DEFAULT_LAMINATE_INPUTS, plies: pliesAt([0, 90]), loads: { ...NO_LOADS, nxNPerMm: 1 } }))
    expect(unsymmetric.coupling.bendingExtension).toBe(true)
    const [, b] = abdMatrices(unsymmetric.stiffness, unsymmetric.layup.thicknessMm, 'si')
    unsymmetric.stiffness.bN.flat().forEach((term, i) => expect(b.rows.flat()[i] === '0').toBe(Math.abs(term) < 1e-6))
    // The quasi-isotropic stack's small bend–twist terms show.
    const [, , d] = abdMatrices(analysis.stiffness, analysis.layup.thicknessMm, 'si')
    expect(d.rows[0][2]).not.toBe('0')
  })
})

describe('formatTerm', () => {
  it('writes three significant figures, zero only below the tolerance', () => {
    expect(formatTerm('force', 'si', 57_300, 0)).toBe('57.3')
    expect(formatTerm('force', 'si', 12.3, 0)).toBe('0.0123')
    expect(formatTerm('force', 'si', -0.00042, 0)).toBe('−4.20e−7')
    expect(formatTerm('force', 'si', 1e-9, 1e-6)).toBe('0')
  })
})

describe('constantViews', () => {
  it('lists the moduli in GPa or Msi and the Poisson ratios bare', () => {
    const si = constantViews(analysis.constants, 'si')
    expect(si.map((c) => c.symbol)).toEqual(['Ex', 'Ey', 'Gxy', 'νxy', 'νyx', 'Ex,f', 'Ey,f'])
    expect(si[0]).toMatchObject({ value: '51.7', unit: 'GPa' })
    expect(si[3]).toMatchObject({ value: '0.313', unit: '' })
    expect(constantViews(analysis.constants, 'imperial')[0].unit).toBe('Msi')
  })
})

describe('COUPLING_FLAGS', () => {
  it('warns about B and A16, A26, not about the bend–twist every ±θ laminate has', () => {
    expect(COUPLING_FLAGS.filter((f) => f.warns).map((f) => f.key)).toEqual(['bendingExtension', 'shearExtension'])
  })
})
