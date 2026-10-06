import { describe, expect, it } from 'vitest'
import { seedProjects } from '../../../core/projects'
import { expectOk } from '../../../core/testing'
import { lamSnapshot } from './lamSnapshot'
import { DEFAULT_LAMINATE_INPUTS, NO_LOADS } from './state/lamInputs'
import { lamInputsFrom } from './state/readInputs'

const seedLamRevisions = seedProjects().projects.flatMap((project) =>
  project.calculations
    .filter((calculation) => calculation.tool === 'lam')
    .flatMap((calculation) => calculation.revisions.map((revision) => ({ name: `${project.id}/${revision.id}`, revision }))),
)

describe('demo project laminate revisions', () => {
  it('exist', () => {
    expect(seedLamRevisions.length).toBeGreaterThan(0)
  })

  it.each(seedLamRevisions)('$name reopens with the stored inputs', ({ revision }) => {
    expect(lamInputsFrom(revision.snapshot.inputs)).toEqual(revision.snapshot.inputs)
  })

  it.each(seedLamRevisions)('$name shows what the tool computes', ({ revision }) => {
    const { title, status, figures, materialIds } = expectOk(lamSnapshot(lamInputsFrom(revision.snapshot.inputs)))
    expect({ title, status, figures, materialIds }).toEqual({
      title: revision.snapshot.title,
      status: revision.snapshot.status,
      figures: revision.snapshot.figures,
      materialIds: revision.snapshot.materialIds,
    })
  })
})

describe('lamSnapshot', () => {
  it('saves nothing for an unloaded laminate (RF ∞ is no verdict)', () => {
    expect(lamSnapshot({ ...DEFAULT_LAMINATE_INPUTS, loads: NO_LOADS })).toEqual({ ok: false, error: expect.stringMatching(/^No load applied/) })
    expect(expectOk(lamSnapshot(DEFAULT_LAMINATE_INPUTS)).status).toBe('review')
  })
})
