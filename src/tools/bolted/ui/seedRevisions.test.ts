import { describe, expect, it } from 'vitest'
import { seedProjects } from '../../../core/projects'
import { expectOk } from '../../../core/testing'
import { boltSnapshot } from './boltSnapshot'
import { boltInputsFrom } from './state/readInputs'

const seedBoltRevisions = seedProjects().projects.flatMap((project) =>
  project.calculations
    .filter((calculation) => calculation.tool === 'bolt')
    .flatMap((calculation) => calculation.revisions.map((revision) => ({ name: `${project.id}/${revision.id}`, revision }))),
)

describe('demo project bolt revisions', () => {
  it('exist', () => {
    expect(seedBoltRevisions.length).toBeGreaterThan(0)
  })

  // A seed stores the inputs of its own mode; the tool fills the other mode with its example.
  it.each(seedBoltRevisions)('$name reopens with the stored inputs', ({ revision }) => {
    expect(boltInputsFrom(revision.snapshot.inputs)).toMatchObject(revision.snapshot.inputs as object)
  })

  it.each(seedBoltRevisions)('$name shows what the tool computes', ({ revision }) => {
    const { title, status, figures, materialIds } = expectOk(boltSnapshot(boltInputsFrom(revision.snapshot.inputs)))
    expect({ title, status, figures, materialIds }).toEqual({
      title: revision.snapshot.title,
      status: revision.snapshot.status,
      figures: revision.snapshot.figures,
      materialIds: revision.snapshot.materialIds,
    })
  })
})
