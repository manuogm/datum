import { describe, expect, it } from 'vitest'
import { figureChanges, findRevision, isSuperseded, materialUsage, previousRevision, projectStats } from './queries'
import { seedProjects } from './seed'

const { projects } = seedProjects()
const upright = projects.find((p) => p.id === 'P-0142')!

describe('projectStats', () => {
  it('counts calculations per tool and decisions', () => {
    const stats = projectStats(upright)
    expect(stats.calculationsByTool).toEqual({ fit: 1, bolt: 2, lam: 1, mat: 2 })
    expect(stats.calculationCount).toBe(6)
    expect(stats.decisionCount).toBe(7)
  })

  it('takes the status from the latest revision and counts open issues', () => {
    const stats = projectStats(upright)
    expect(stats.status).toBe('pass')
    expect(stats.latest?.revision.id).toBe('FT-0412-C')
    expect(stats.openIssues).toEqual({ review: 1, fail: 1 })
    expect(stats.lastActivity).toBe('2026-10-05T14:50:00')
  })

  it('reports released and empty projects', () => {
    expect(projectStats({ ...upright, stage: 'released' }).status).toBe('released')
    const empty = projectStats({ ...upright, calculations: [], decisions: [] })
    expect([empty.status, empty.lastActivity, empty.latest]).toEqual(['open', upright.createdAt, null])
  })
})

describe('revision history', () => {
  const pin = upright.calculations.find((c) => c.id === 'FT-0412')!
  const [a, b, c] = pin.revisions

  it('marks every revision but the last as superseded', () => {
    expect([a, b, c].map((r) => isSuperseded(pin, r))).toEqual([true, true, false])
  })

  it('finds the previous revision', () => {
    expect(previousRevision(pin, c)?.rev).toBe('B')
    expect(previousRevision(pin, a)).toBeUndefined()
  })

  it('finds a revision by id', () => {
    expect(findRevision(projects, 'P-0142', 'FT-0412-B')?.revision).toBe(b)
    expect(findRevision(projects, 'P-0142', 'FT-0412-Z')).toBeNull()
    expect(findRevision(projects, 'P-404', 'FT-0412-B')).toBeNull()
  })
})

describe('figureChanges', () => {
  it('lists changed, new and removed figures with their units', () => {
    const before = [
      { label: 'Fit', value: 'H7/g6' },
      { label: 'C at 20 °C', value: '7…41', unit: 'µm' },
      { label: 'Gone', value: '1' },
    ]
    const after = [
      { label: 'Fit', value: 'H7/p6' },
      { label: 'C at 20 °C', value: '7…41', unit: 'µm' },
      { label: 'New', value: '2', unit: 'mm' },
    ]
    expect(figureChanges(before, after)).toEqual([
      { label: 'Fit', before: 'H7/g6', after: 'H7/p6' },
      { label: 'New', before: undefined, after: '2 mm' },
      { label: 'Gone', before: '1' },
    ])
  })
})

describe('materialUsage', () => {
  it('finds current revisions that use a material', () => {
    const uses = materialUsage(projects, 'ti-6al-4v').map((u) => `${u.project.id} ${u.part.name} ${u.calculation.id}`)
    expect(uses).toEqual(['P-0142 Wishbone clevis BJ-0175', 'P-0142 Wishbone clevis MD-0012', 'P-0142 Caliper mount pattern BJ-0187', 'P-0119 Fitting BJ-0164'])
  })
})
