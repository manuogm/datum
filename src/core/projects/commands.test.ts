import { describe, expect, it } from 'vitest'
import type { Result } from '../result'
import {
  approveDecision, createProject, recordDecision, saveRevision, setActiveProject, setProjectStage, updateProject,
  type SaveRevisionRequest,
} from './commands'
import type { ProjectsState } from './model'
import { findCalculation, findRevision } from './queries'
import { seedProjects } from './seed'
import { DRAFT, EMPTY, fitSnapshot, ME } from './testData'

const NOW = '2026-10-05T15:00:00'

function value<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error)
  return result.value
}

function withProject(): ProjectsState {
  return value(createProject(EMPTY, DRAFT, NOW)).state
}

function save(state: ProjectsState, overrides: Partial<SaveRevisionRequest> = {}) {
  return saveRevision(
    state,
    {
      projectId: 'P-0001',
      part: { id: 'spacer-bush' },
      snapshot: fitSnapshot('H7/g6', '7…41'),
      note: 'First pass',
      reportAttached: false,
      author: ME,
      ...overrides,
    },
    NOW,
  )
}

describe('createProject', () => {
  it('numbers projects after the highest existing code', () => {
    const seeded = value(createProject(seedProjects(), DRAFT, NOW))
    expect(seeded.project.id).toBe('P-0143')
    expect(seeded.state.projects[0].id).toBe('P-0143')
    expect(value(createProject(EMPTY, DRAFT, NOW)).project.id).toBe('P-0001')
  })

  it('creates parts with ids derived from their names', () => {
    const { project } = value(createProject(EMPTY, DRAFT, NOW))
    expect(project.parts.map((p) => p.id)).toEqual(['caliper-bracket', 'mounting-bolts', 'spacer-bush'])
    expect(project.stage).toBe('open')
    expect(project.targets.serviceTempMaxC).toBe(160)
  })

  it('refuses a nameless project, duplicate parts and an empty temperature range', () => {
    expect(createProject(EMPTY, { ...DRAFT, name: '  ' }, NOW).ok).toBe(false)
    expect(createProject(EMPTY, { ...DRAFT, parts: [{ name: 'Pin' }, { name: 'pin' }] }, NOW).ok).toBe(false)
    const targets = { ...DRAFT.targets, serviceTempMinC: 160, serviceTempMaxC: 20 }
    expect(createProject(EMPTY, { ...DRAFT, targets }, NOW).ok).toBe(false)
  })
})

describe('updateProject', () => {
  it('renames parts in place and adds new ones', () => {
    const state = withProject()
    const parts = [{ id: 'caliper-bracket', name: 'Caliper bracket LH' }, { name: 'Shim' }]
    const project = value(updateProject(state, 'P-0001', { ...DRAFT, parts })).projects[0]
    expect(project.parts).toEqual([
      { id: 'caliper-bracket', name: 'Caliper bracket LH' },
      { id: 'shim', name: 'Shim' },
    ])
  })

  it('keeps parts that have calculations', () => {
    const state = value(save(withProject())).state
    const result = updateProject(state, 'P-0001', { ...DRAFT, parts: [{ name: 'Other' }] })
    expect(result).toEqual({ ok: false, error: '"Spacer bush" has saved calculations and cannot be removed.' })
  })
})

describe('saveRevision', () => {
  it('starts a calculation at Rev A and makes the project and part active', () => {
    const saved = value(save(withProject()))
    expect(saved.revisionId).toBe('FT-0001-A')
    expect(saved.state.active).toEqual({ projectId: 'P-0001', partId: 'spacer-bush' })
    const calculation = findCalculation(saved.state.projects[0], 'spacer-bush', 'fit')
    expect(calculation?.revisions.map((r) => r.rev)).toEqual(['A'])
  })

  it('adds the next letter to the same part and tool', () => {
    let state = withProject()
    for (const fit of ['H7/f7', 'H7/g6', 'H7/p6']) state = value(save(state, { snapshot: fitSnapshot(fit, '0') })).state
    const calculation = findCalculation(state.projects[0], 'spacer-bush', 'fit')
    expect(calculation?.revisions.map((r) => r.id)).toEqual(['FT-0001-A', 'FT-0001-B', 'FT-0001-C'])
  })

  it('keeps separate calculations per part and per tool', () => {
    let state = value(save(withProject())).state
    state = value(save(state, { part: { id: 'caliper-bracket' } })).state
    const bolt = { ...fitSnapshot('x', '0'), tool: 'bolt' as const }
    state = value(save(state, { snapshot: bolt })).state
    expect(state.projects[0].calculations.map((c) => c.id)).toEqual(['FT-0001', 'FT-0002', 'BJ-0001'])
  })

  it('continues calculation numbers across projects', () => {
    const saved = value(save(value(createProject(seedProjects(), DRAFT, NOW)).state, { projectId: 'P-0143' }))
    expect(saved.revisionId).toBe('FT-0413-A')
  })

  it('adds a new part when asked to', () => {
    const saved = value(save(withProject(), { part: { newName: 'Carrier pin' } }))
    expect(saved.state.projects[0].parts.at(-1)).toEqual({ id: 'carrier-pin', name: 'Carrier pin' })
    expect(save(withProject(), { part: { newName: 'spacer bush' } }).ok).toBe(false)
  })

  it('records a proposed decision based on the revision', () => {
    const saved = value(save(withProject(), { decisionTitle: 'Spacer fit H7/g6', note: 'Location matters' }))
    expect(saved.decisionId).toBe('D-001')
    expect(saved.state.projects[0].decisions[0]).toMatchObject({
      id: 'D-001',
      title: 'Spacer fit H7/g6',
      rationale: 'Location matters',
      status: 'proposed',
      basis: { calculationId: 'FT-0001', rev: 'A' },
    })
  })

  it('refuses unknown projects and parts, and released projects', () => {
    expect(save(withProject(), { projectId: 'P-9999' }).ok).toBe(false)
    expect(save(withProject(), { part: { id: 'nope' } }).ok).toBe(false)
    const released = value(setProjectStage(withProject(), 'P-0001', 'released'))
    expect(save(released).ok).toBe(false)
  })

  it('can be found again by project and revision id', () => {
    const saved = value(save(withProject()))
    const found = findRevision(saved.state.projects, 'P-0001', saved.revisionId)
    expect(found?.revision.snapshot.inputs).toEqual({ nominalMm: 25, fit: 'H7/g6' })
    expect(found?.part.name).toBe('Spacer bush')
  })
})

describe('decisions', () => {
  it('numbers decisions per project and approves them', () => {
    let state = recordDecisionOn(withProject(), 'Use Keenserts')
    state = recordDecisionOn(state, 'Heat the housing')
    const approver = { initials: 'JO', name: 'J. Okafor' }
    state = value(approveDecision(state, 'P-0001', 'D-002', approver, NOW))
    const [first, second] = state.projects[0].decisions
    expect([first.id, first.status]).toEqual(['D-001', 'proposed'])
    expect([second.id, second.status, second.approvedBy]).toEqual(['D-002', 'approved', approver])
  })

  it('refuses an untitled decision', () => {
    expect(recordDecision(withProject(), 'P-0001', { title: ' ', rationale: '', proposedBy: ME }, NOW).ok).toBe(false)
  })
})

function recordDecisionOn(state: ProjectsState, title: string): ProjectsState {
  return value(recordDecision(state, 'P-0001', { title, rationale: 'Because', proposedBy: ME }, NOW))
}

describe('setActiveProject', () => {
  it('sets and clears the active project, and rejects unknown ones', () => {
    const state = withProject()
    expect(value(setActiveProject(state, { projectId: 'P-0001' })).active).toEqual({ projectId: 'P-0001' })
    expect(value(setActiveProject(state, null)).active).toBeNull()
    expect(setActiveProject(state, { projectId: 'P-0404' }).ok).toBe(false)
  })
})
