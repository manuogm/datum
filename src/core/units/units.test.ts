import { describe, expect, it } from 'vitest'
import { formatDecimal, formatQuantity, formatQuantityRange, fromDisplay, parseDecimal, toDisplay, unitOf } from './units'

describe('formatQuantity', () => {
  it('writes SI values in their native units', () => {
    expect(formatQuantity('length', 'si', 25)).toBe('25.000')
    expect(formatQuantity('deviation', 'si', 21)).toBe('21')
    expect(formatQuantity('deviation', 'si', 10.5)).toBe('10.5')
    expect(formatQuantity('temperature', 'si', 140, { withUnit: true })).toBe('140 °C')
  })

  it('converts to inches, thou and °F for Imperial', () => {
    expect(formatQuantity('length', 'imperial', 25.4)).toBe('1.0000')
    expect(formatQuantity('length', 'imperial', 25)).toBe('0.9843')
    expect(formatQuantity('deviation', 'imperial', 21, { withUnit: true })).toBe('0.83 thou')
    expect(formatQuantity('temperature', 'imperial', -20)).toBe('−4')
    expect(formatQuantity('temperature', 'imperial', 140)).toBe('284')
    expect(formatQuantity('expansion', 'imperial', 23.4)).toBe('13')
  })

  it('signs deviations on request and never shows −0', () => {
    expect(formatQuantity('deviation', 'si', 21, { signed: true })).toBe('+21')
    expect(formatQuantity('deviation', 'si', -7, { signed: true })).toBe('−7')
    expect(formatQuantity('deviation', 'si', 0, { signed: true })).toBe('0')
    expect(formatQuantity('deviation', 'si', -0.01)).toBe('0')
  })
})

describe('formatQuantityRange', () => {
  it('joins two values with an ellipsis and the unit', () => {
    expect(formatQuantityRange('temperature', 'si', -20, 140)).toBe('−20 … 140 °C')
    expect(formatQuantityRange('deviation', 'si', 0, 40, false)).toBe('0 … 40')
  })
})

describe('toDisplay / fromDisplay', () => {
  it('round-trips every quantity in both systems', () => {
    for (const quantity of ['length', 'deviation', 'temperature', 'expansion', 'density', 'modulus', 'strength', 'conductivity', 'force', 'torque', 'area', 'stiffness', 'resilience', 'lineLoad', 'lineMoment', 'bendingStiffness', 'curvature', 'arealMass'] as const) {
      for (const system of ['si', 'imperial'] as const) {
        expect(fromDisplay(quantity, system, toDisplay(quantity, system, 37.25))).toBeCloseTo(37.25, 9)
      }
    }
  })

  it('uses the exact inch and the Fahrenheit offset', () => {
    expect(fromDisplay('length', 'imperial', 1)).toBe(25.4)
    expect(fromDisplay('deviation', 'imperial', 1)).toBe(25.4)
    expect(fromDisplay('temperature', 'imperial', 212)).toBe(100)
  })
})

describe('laminate running loads', () => {
  it('shows N/mm and N·mm/mm, D in N·m, and their Imperial counterparts', () => {
    expect(formatQuantity('lineLoad', 'si', 250, { withUnit: true })).toBe('250.0 N/mm')
    expect(formatQuantity('lineLoad', 'imperial', 250, { withUnit: true })).toBe('1427.5 lbf/in')
    expect(formatQuantity('lineMoment', 'imperial', 100, { withUnit: true })).toBe('22.48 lbf·in/in')
    expect(formatQuantity('bendingStiffness', 'si', 5000, { withUnit: true })).toBe('5.00 N·m')
    expect(formatQuantity('curvature', 'si', 0.002, { withUnit: true })).toBe('2.000 1/m')
  })
})

describe('material properties', () => {
  it('shows SI values as stored, with fixed decimals', () => {
    expect(formatQuantity('density', 'si', 4.43)).toBe('4.43')
    expect(formatQuantity('modulus', 'si', 210)).toBe('210.0')
    expect(formatQuantity('strength', 'si', 880)).toBe('880')
    expect(formatQuantity('conductivity', 'si', 6.7)).toBe('6.7')
  })

  it('converts to Imperial', () => {
    expect(formatQuantity('density', 'imperial', 7.85)).toBe('0.284') // steel ≈ 0.284 lb/in³
    expect(formatQuantity('modulus', 'imperial', 200)).toBe('29.0') // 29 Msi
    expect(formatQuantity('strength', 'imperial', 880)).toBe('127.6')
    expect(formatQuantity('conductivity', 'imperial', 6.7)).toBe('3.9')
    expect(formatQuantity('temperature', 'imperial', 350)).toBe('662')
    expect(formatQuantity('expansion', 'imperial', 8.6)).toBe('4.8')
  })

  it('names the units', () => {
    expect(unitOf('density', 'imperial')).toBe('lb/in³')
    expect(unitOf('modulus', 'imperial')).toBe('Msi')
    expect(unitOf('strength', 'imperial')).toBe('ksi')
    expect(unitOf('conductivity', 'si')).toBe('W/(m·K)')
  })
})

describe('area, stiffness and resilience', () => {
  it('shows bolt section and elastic properties', () => {
    expect(formatQuantity('area', 'si', 57.99, { withUnit: true })).toBe('57.99 mm²')
    expect(formatQuantity('area', 'imperial', 645.16, { withUnit: true })).toBe('1.0000 in²')
    // 300 kN/mm = 300 000 N/mm; 1 N/mm = 5.71 lbf/in
    expect(formatQuantity('stiffness', 'si', 300_000, { withUnit: true })).toBe('300.0 kN/mm')
    expect(formatQuantity('stiffness', 'imperial', 1000, { withUnit: true })).toBe('5.7 klbf/in')
    // δ = 3.2e-6 mm/N = 3.2 µm/kN
    expect(formatQuantity('resilience', 'si', 3.2e-6, { withUnit: true })).toBe('3.200 µm/kN')
    expect(formatQuantity('resilience', 'imperial', 1e-6, { withUnit: true })).toBe('0.175 µin/lbf')
  })
})

describe('force and torque', () => {
  it('shows forces stored in N as kN or lbf, torques as N·m or lbf·ft', () => {
    expect(formatQuantity('force', 'si', 43480, { withUnit: true })).toBe('43.48 kN')
    expect(formatQuantity('force', 'imperial', 4448.222, { withUnit: true })).toBe('1000 lbf')
    expect(formatQuantity('torque', 'si', 71.2, { withUnit: true })).toBe('71.2 N·m')
    expect(formatQuantity('torque', 'imperial', 1.355818)).toBe('1.0')
  })
})

describe('unitOf', () => {
  it('names the display unit', () => {
    expect(unitOf('length', 'si')).toBe('mm')
    expect(unitOf('length', 'imperial')).toBe('in')
    expect(unitOf('deviation', 'imperial')).toBe('thou')
    expect(unitOf('temperature', 'imperial')).toBe('°F')
  })
})

describe('formatDecimal', () => {
  it('keeps trailing zeros only when fixed', () => {
    expect(formatDecimal(2.5, 3, true)).toBe('2.500')
    expect(formatDecimal(2.5, 3)).toBe('2.5')
  })
})

describe('parseDecimal', () => {
  it('reads numbers the way people type them', () => {
    expect(parseDecimal('25')).toBe(25)
    expect(parseDecimal(' −20 ')).toBe(-20)
    expect(parseDecimal('-0.5')).toBe(-0.5)
    expect(parseDecimal('+3')).toBe(3)
    expect(parseDecimal('0,984')).toBe(0.984)
    expect(parseDecimal('.5')).toBe(0.5)
    expect(parseDecimal('12.')).toBe(12)
  })

  it('rejects incomplete or non-numeric text', () => {
    for (const text of ['', '-', '−', '1e3', 'abc', '1.2.3', '1-2']) expect(parseDecimal(text)).toBeNull()
  })
})
