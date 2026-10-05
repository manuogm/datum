import { describe, expect, it } from 'vitest'
import { MATERIALS } from '../../core/materials'
import { seedProjects } from '../../core/projects'
import { buildHomeData } from './homeData'

describe('buildHomeData', () => {
  const data = buildHomeData(seedProjects().projects, MATERIALS)

  it('highlights the tool of the latest revision and lists the last calculation per tool', () => {
    expect(data.lastUsedTool).toBe('fit')
    expect(data.lastCalculation).toEqual({ fit: 'Ø25 H7/p6', bolt: '8-bolt pattern, LC3', lam: '[0/±45/90]s' })
  })

  it('lists the three most recently active projects', () => {
    expect(data.recentProjects.map((p) => p.id)).toEqual(['P-0142', 'P-0139', 'P-0131'])
    expect(data.recentProjects[0]).toMatchObject({
      lastCalculation: 'Fit Tolerance · Bearing carrier pin Rev C',
      status: 'pass',
      calculationCount: 6,
      decisionCount: 7,
    })
  })

  it('names only the standards bodies the materials actually cite', () => {
    expect(data.materials).toEqual({ count: MATERIALS.length, sources: ['EN', 'ISO', 'AMS', 'ASTM'] })
  })

  it('copes with no projects', () => {
    const empty = buildHomeData([], [])
    expect(empty).toEqual({ lastUsedTool: null, lastCalculation: {}, materials: { count: 0, sources: [] }, recentProjects: [] })
  })
})
