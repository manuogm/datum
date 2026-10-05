import { describe, expect, it } from 'vitest'
import { seedProjects } from '../../core/projects'
import { draftFromProject, emptyDraft, initialsOf } from './projectDraft'

describe('initialsOf', () => {
  it('takes the first and last initial', () => {
    expect(initialsOf('Jane Okafor')).toBe('JO')
    expect(initialsOf('J. Okafor')).toBe('JO')
    expect(initialsOf('ana maría lindqvist')).toBe('AL')
    expect(initialsOf('Reyes')).toBe('RE')
    expect(initialsOf('  ')).toBe('')
  })
})

describe('drafts', () => {
  it('starts a new project with its owner', () => {
    expect(emptyDraft({ initials: 'MR', name: 'M. Reyes' }).team).toEqual([{ initials: 'MR', name: 'M. Reyes', role: 'Owner' }])
  })

  it('keeps part ids when editing a project', () => {
    const project = seedProjects().projects[0]
    expect(draftFromProject(project).parts[0]).toEqual({ id: 'bearing-carrier-pin', name: 'Bearing carrier pin' })
  })
})
