import { describe, expect, it } from 'vitest'
import { seedProjects } from '../../../core/projects'
import { expectOk } from '../calc/testHelpers'
import { fitSnapshot } from './fitSnapshot'
import { fitInputsFrom } from './state/readInputs'

const seedFitRevisions = seedProjects().projects.flatMap((project) =>
  project.calculations
    .filter((calculation) => calculation.tool === 'fit')
    .flatMap((calculation) => calculation.revisions.map((revision) => ({ name: `${project.id}/${revision.id}`, revision }))),
)

describe('demo project fit revisions', () => {
  it('exist', () => {
    expect(seedFitRevisions.length).toBeGreaterThan(0)
  })

  it.each(seedFitRevisions)('$name reopens exactly as stored', ({ revision }) => {
    expect(fitInputsFrom(revision.snapshot.inputs)).toEqual(revision.snapshot.inputs)
  })

  it.each(seedFitRevisions)('$name shows what the tool computes', ({ revision }) => {
    const { title, status, figures, materialIds } = expectOk(fitSnapshot(fitInputsFrom(revision.snapshot.inputs)))
    expect({ title, status, figures, materialIds }).toEqual({
      title: revision.snapshot.title,
      status: revision.snapshot.status,
      figures: revision.snapshot.figures,
      materialIds: revision.snapshot.materialIds,
    })
  })
})
