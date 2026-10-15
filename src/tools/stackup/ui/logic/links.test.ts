import { describe, expect, it } from 'vitest'
import { STACK_ASSEMBLY_EXAMPLE, seedLibrary, type Calculation, type Library } from '../../../../core/library'
import { stackInputsFrom } from '../state/readInputs'
import { EXAMPLE_STACK_INPUTS, type LinkedRow, type StackInputs } from '../state/stackInputs'
import { assembliesLinking, linkedPartIds } from '../state/linkedParts'
import {
  brokenLinksNote, linkNote, linkStateText, partResultText, partStacks, resolveLink, resolveLinks, snapshotOfPart, withLinkSnapshots,
} from './links'
import { stackResults, stackStatus } from './stackResults'
import { expectOk } from '../../../../core/testing'

const SEEDED = '2026-10-14T14:02:00'
const LATER = '2026-10-15T09:30:00'
const HOUSING_ID = 'example-stack'
const ASSEMBLY_ID = STACK_ASSEMBLY_EXAMPLE.id

const assemblyInputs = (): StackInputs => stackInputsFrom(STACK_ASSEMBLY_EXAMPLE.inputs(SEEDED))
const linkedRow = (): LinkedRow => {
  const row = assemblyInputs().rows[0]
  if (row.kind !== 'linked') throw new Error('the assembly example starts with the housing link')
  return row
}

/** The seeded library with the housing calculation changed. */
function withHousing(changes: Partial<Calculation>): Library {
  const library = seedLibrary(SEEDED)
  return { ...library, calculations: library.calculations.map((c) => (c.id === HOUSING_ID ? { ...c, ...changes } : c)) }
}

describe('resolveLink', () => {
  it('is linked when the part is as the assembly last saw it', () => {
    const link = resolveLink(linkedRow(), seedLibrary(SEEDED))
    expect(link.state).toBe('linked')
    expect(link.partName).toBe('Housing')
    expect(link.folderName).toBe('Examples')
    expect(link.partStatus).toBe('pass')
    expect(link.part?.contributors).toHaveLength(3)
    expect(linkNote('si', link)).toBeNull()
  })

  it('is updated when the part was saved since, and uses its new values', () => {
    const inputs = { ...EXAMPLE_STACK_INPUTS, rows: EXAMPLE_STACK_INPUTS.rows.map((r, i) => (i === 0 && r.kind === 'dimension' ? { ...r, tolerance: { kind: 'symmetric' as const, plusMinus: 0.1 } } : r)) }
    const link = resolveLink(linkedRow(), withHousing({ inputs, updatedAt: LATER }))
    expect(link.state).toBe('updated')
    expect(link.stack.upperDeviation).toBeCloseTo(0.22, 12)
    expect(link.stack.lowerDeviation).toBeCloseTo(-0.15, 12)
    expect(linkNote('si', link)).toBe('Changed since this assembly was saved: was 20.925 +0.170/−0.100.')
  })

  it('falls back on the last known values when the part is deleted', () => {
    const library = seedLibrary(SEEDED)
    const link = resolveLink(linkedRow(), { ...library, calculations: library.calculations.filter((c) => c.id !== HOUSING_ID) })
    expect(link).toMatchObject({ state: 'missing', stack: linkedRow().last.stack, part: null, partStatus: null })
    expect(linkNote('si', link)).toBe('Deleted: last known values used.')
    expect(linkStateText(link)).toBe('Missing: last known values')
  })

  it('is not a part when the part was switched to Assembly', () => {
    const link = resolveLink(linkedRow(), withHousing({ inputs: { ...EXAMPLE_STACK_INPUTS, mode: 'assembly' } }))
    expect(link.state).toBe('not-a-part')
    expect(linkNote('si', link)).toBe('Switched to Assembly: last known values used.')
  })

  it('says the part fails when its own chain is rejected', () => {
    const link = resolveLink(linkedRow(), withHousing({ inputs: { ...EXAMPLE_STACK_INPUTS, rows: [] } }))
    expect(link.state).toBe('part-fails')
    expect(linkNote('si', link)).toBe('Its own chain has an error: last known values used.')
  })

  it('notes unsaved edits in the part without using them', () => {
    const link = resolveLink(linkedRow(), seedLibrary(SEEDED), (id) => id === HOUSING_ID)
    expect(link.state).toBe('linked')
    expect(linkNote('si', link)).toBe('Unsaved edits in its tab are not used until it is saved.')
  })
})

describe('a broken link in an assembly', () => {
  it('caps a pass at review, never lowers a review or a fail', () => {
    const library = seedLibrary(SEEDED)
    const analysis = expectOk(stackResults(assemblyInputs(), library).analysis)
    const pass = { ...analysis, verdict: analysis.verdict && { ...analysis.verdict, status: 'pass' as const } }
    expect(stackStatus(pass, 0)).toBe('pass')
    expect(stackStatus(pass, 1)).toBe('review')
    const fail = { ...analysis, verdict: analysis.verdict && { ...analysis.verdict, status: 'fail' as const } }
    expect(stackStatus(fail, 1)).toBe('fail')
    expect(stackStatus({ ...analysis, verdict: null }, 1)).toBe('none')
  })

  it('is named in the note above the chain', () => {
    const library = seedLibrary(SEEDED)
    const deleted = { ...library, calculations: library.calculations.filter((c) => c.id !== HOUSING_ID) }
    const results = stackResults(assemblyInputs(), deleted)
    expect(results.brokenLinks).toHaveLength(1)
    expect(brokenLinksNote(results.brokenLinks)).toBe('1 linked part uses last known values: Housing (deleted).')
    expect(brokenLinksNote([])).toBeNull()
  })
})

describe('withLinkSnapshots', () => {
  it('records the values an updated link now uses, so Save clears "updated"', () => {
    const library = withHousing({ updatedAt: LATER })
    const inputs = assemblyInputs()
    const saved = withLinkSnapshots(inputs, resolveLinks(inputs, library))
    expect(saved).not.toBe(inputs)
    const row = saved.rows[0]
    expect(row.kind === 'linked' && row.last.updatedAt).toBe(LATER)
    expect(resolveLinks(saved, library).get('r1')?.state).toBe('linked')
  })

  it('leaves the seeded assembly as stored, so it opens with nothing to save', () => {
    const inputs = assemblyInputs()
    expect(withLinkSnapshots(inputs, resolveLinks(inputs, seedLibrary(SEEDED)))).toBe(inputs)
  })

  it('keeps a broken link as it was', () => {
    const library = seedLibrary(SEEDED)
    const deleted = { ...library, calculations: library.calculations.filter((c) => c.id !== HOUSING_ID) }
    const inputs = assemblyInputs()
    expect(withLinkSnapshots(inputs, resolveLinks(inputs, deleted))).toBe(inputs)
  })
})

describe('the link picker', () => {
  it('lists the Part stacks of every folder, not the assemblies or other tools', () => {
    const parts = partStacks(seedLibrary(SEEDED))
    expect(parts.map((p) => p.calculation.id)).toEqual([HOUSING_ID])
    const snapshot = snapshotOfPart(parts[0])
    expect(snapshot).toMatchObject({ partName: 'Housing', resultName: 'Shoulder to circlip groove', folderName: 'Examples', updatedAt: SEEDED })
    expect(snapshot && partResultText('si', snapshot.stack)).toBe('20.925 +0.170/−0.100')
  })
})

describe('linkedPartIds and assembliesLinking', () => {
  it('finds the assemblies that use a part, for the delete dialog and Home', () => {
    const library = seedLibrary(SEEDED)
    const assembly = library.calculations.find((c) => c.id === ASSEMBLY_ID)
    expect(assembly && linkedPartIds(assembly)).toEqual([HOUSING_ID])
    expect(assembliesLinking(library, [HOUSING_ID]).map((c) => c.id)).toEqual([ASSEMBLY_ID])
    // Deleting both at once: the assembly is not a dependent left behind.
    expect(assembliesLinking(library, [HOUSING_ID, ASSEMBLY_ID])).toEqual([])
  })

  it('reads nothing from other tools or from a Part stack', () => {
    expect(linkedPartIds({ tool: 'fit', inputs: { mode: 'assembly', rows: [{ kind: 'linked', calcId: 'x' }] } })).toEqual([])
    expect(linkedPartIds({ tool: 'stack', inputs: null })).toEqual([])
    expect(linkedPartIds({ tool: 'stack', inputs: { mode: 'part', rows: [{ kind: 'linked', calcId: 'x' }] } })).toEqual([])
  })
})
