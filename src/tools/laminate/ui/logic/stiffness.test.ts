import { describe, expect, it } from 'vitest'
import { expectOk } from '../../../../core/testing'
import { DEFAULT_LAMINATE_INPUTS } from '../state/lamInputs'
import { analyse } from './lamResults'
import { abdMatrices, constantViews } from './stiffness'

const analysis = expectOk(analyse(DEFAULT_LAMINATE_INPUTS))

describe('abdMatrices', () => {
  it('shows A in kN/mm, B in kN and D in N·m', () => {
    const [a, b, d] = abdMatrices(analysis.stiffness, 'si')
    expect([a.unit, b.unit, d.unit]).toEqual(['kN/mm', 'kN', 'N·m'])
    expect(a.rows[0][0]).toBe((analysis.stiffness.aNPerMm[0][0] / 1000).toFixed(1))
    expect(b.rows.flat().every((v) => v === '0.00')).toBe(true)
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
