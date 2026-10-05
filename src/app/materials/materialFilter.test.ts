import { describe, expect, it } from 'vitest'
import { MATERIALS } from '../../core/materials'
import { defaultFilter, matchesFilter, type MaterialFilter } from './materialFilter'

const names = (filter: MaterialFilter) => MATERIALS.filter((m) => matchesFilter(m, filter)).map((m) => m.name)

describe('matchesFilter', () => {
  it('shows every material by default', () => {
    expect(names(defaultFilter())).toHaveLength(MATERIALS.length)
  })

  it('searches name, spec, condition and designation', () => {
    expect(names({ ...defaultFilter(), query: 'r56400' })).toEqual(['Ti-6Al-4V Grade 5'])
    expect(names({ ...defaultFilter(), query: 'ams 5662' })).toEqual(['Inconel 718'])
  })

  it('keeps materials rated for the service temperature', () => {
    const hot = MATERIALS.filter((m) => matchesFilter(m, defaultFilter(140)))
    expect(hot.every((m) => m.maxServiceTempC >= 140)).toBe(true)
    expect(hot.map((m) => m.name)).not.toContain('Al 7075-T6')
  })

  it('filters by family, density window and yield strength', () => {
    expect(names({ ...defaultFilter(), families: new Set(['titanium']) })).toEqual(['Ti-6Al-4V Grade 5', 'Ti-5553'])
    expect(names({ ...defaultFilter(), densityGPerCm3: [1, 2] }).every((n) => !n.startsWith('Al'))).toBe(true)
    const strong = names({ ...defaultFilter(), minYieldMPa: 1100 })
    expect(strong).toContain('300M')
    expect(strong).not.toContain('CFRP UD 0°')
  })

  it('filters by the kind of the main source', () => {
    const standards = names({ ...defaultFilter(), sourceKinds: new Set(['standard']) })
    expect(standards).toContain('42CrMo4 +QT')
    expect(standards).not.toContain('Ti-6Al-4V Grade 5') // ASM handbook values
  })
})
