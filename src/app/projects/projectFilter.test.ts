import { describe, expect, it } from 'vitest'
import { projectStats, seedProjects } from '../../core/projects'
import { filterProjects } from './projectFilter'

const rows = seedProjects().projects.map((project) => ({ project, stats: projectStats(project) }))
const ids = (list: typeof rows) => list.map((r) => r.project.id)

describe('filterProjects', () => {
  it('splits projects by stage and status', () => {
    expect(ids(filterProjects(rows, 'all', ''))).toHaveLength(8)
    expect(ids(filterProjects(rows, 'released', ''))).toEqual(['P-0128', 'P-0114', 'P-0108'])
    expect(ids(filterProjects(rows, 'review', ''))).toEqual(['P-0139', 'P-0125'])
    expect(ids(filterProjects(rows, 'open', ''))).not.toContain('P-0128')
  })

  it('searches names, codes, programmes and parts', () => {
    expect(ids(filterProjects(rows, 'all', 'p-0131'))).toEqual(['P-0131'])
    expect(ids(filterProjects(rows, 'all', 'halcyon'))).toEqual(['P-0119'])
    expect(ids(filterProjects(rows, 'all', 'carrier pin'))).toEqual(['P-0142'])
    expect(ids(filterProjects(rows, 'released', 'battery'))).toEqual(['P-0108'])
  })
})
