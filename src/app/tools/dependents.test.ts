import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { STACK_ASSEMBLY_EXAMPLE, findCalculation, seedLibrary } from '../../core/library'
import { ok } from '../../core/result'

// The library lives in the browser: give it a window with an in-memory
// localStorage before loading it. Each test starts from the seeded library.
const stored = new Map<string, string>()
vi.stubGlobal('window', {
  localStorage: {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => void stored.set(key, value),
    removeItem: (key: string) => void stored.delete(key),
  },
  addEventListener: () => {},
  removeEventListener: () => {},
})

let store: typeof import('../library/libraryStore')
let actions: typeof import('../library/useLibrary').libraryActions
let drafts: typeof import('../library/drafts')
let dependents: typeof import('./dependents')
let stack: typeof import('../../tools/stackup/ui/state/stackInputs')
let readInputs: typeof import('../../tools/stackup/ui/state/readInputs')

beforeAll(async () => {
  store = await import('../library/libraryStore')
  actions = (await import('../library/useLibrary')).libraryActions
  drafts = await import('../library/drafts')
  dependents = await import('./dependents')
  stack = await import('../../tools/stackup/ui/state/stackInputs')
  readInputs = await import('../../tools/stackup/ui/state/readInputs')
})

const SEEDED = '2026-10-14T14:02:00'
beforeEach(() => {
  store.applyChange(() => ok(seedLibrary(SEEDED)))
  drafts.discardDraft(STACK_ASSEMBLY_EXAMPLE.id)
})

const HOUSING_ID = 'example-stack'
const library = () => store.getSnapshot().state
const assembly = () => findCalculation(library(), STACK_ASSEMBLY_EXAMPLE.id)
/** The housing as the assembly's linked row records it (its `last` snapshot). */
function recordedHousing(inputs: unknown) {
  const row = readInputs.stackInputsFrom(inputs).rows[0]
  if (row.kind !== 'linked') throw new Error('the first row links the housing')
  return row.last
}

/** The housing example with its shoulder depth at ±0.1 instead of ±0.05: 20.925 +0.220/−0.150. */
function housingWithWiderShoulder() {
  const { EXAMPLE_STACK_INPUTS } = stack
  return {
    ...EXAMPLE_STACK_INPUTS,
    rows: EXAMPLE_STACK_INPUTS.rows.map((row, i) => (i === 0 && row.kind === 'dimension' ? { ...row, tolerance: { kind: 'symmetric' as const, plusMinus: 0.1 } } : row)),
  }
}

/** Saves the part (as its screen would) and lets the dependents catch up. */
async function savePart(inputs: unknown) {
  const before = library()
  actions.saveCalculation(HOUSING_ID, inputs, null)
  await dependents.refreshDependents([HOUSING_ID], before)
}

async function deletePart() {
  const before = library()
  actions.deleteCalculation(HOUSING_ID)
  await dependents.refreshDependents([HOUSING_ID], before)
}

describe('an assembly that links a part stack', () => {
  it('gets its summary on Home worked out again when the part is saved, keeping its own inputs and time', async () => {
    const before = assembly()
    expect(before?.summary).toEqual(STACK_ASSEMBLY_EXAMPLE.summary)
    await savePart(housingWithWiderShoulder())
    const after = assembly()
    // ±0.05 more on the housing widens the end play by 0.05 on each side.
    expect(after?.summary?.figures[0]).toMatchObject({ label: 'WC', value: '−0.005 … 0.605', unit: 'mm' })
    expect(after?.summary?.status).toBe('review')
    // The link still resolves: its snapshot stays what the assembly was saved with, so it can show UPDATED.
    expect(after?.inputs).toEqual(before?.inputs)
    expect(after?.updatedAt).toBe(before?.updatedAt)
  })

  it('keeps the part’s last saved values when the part is deleted (S2), not its own older snapshot', async () => {
    const savedAt = assembly()?.updatedAt
    await savePart(housingWithWiderShoulder())
    await deletePart()
    const after = assembly()
    const last = recordedHousing(after?.inputs)
    expect(last.stack.upperDeviation).toBeCloseTo(0.22, 9)
    expect(last.stack.lowerDeviation).toBeCloseTo(-0.15, 9)
    expect(last.partName).toBe('Housing')
    // Home keeps the wider housing's end play, capped at review by the broken link; not an edit of the assembly.
    expect(after?.summary?.figures[0]).toMatchObject({ value: '−0.005 … 0.605' })
    expect(after?.summary?.status).toBe('review')
    expect(after?.updatedAt).toBe(savedAt)
  })

  it('records the last good values when the part is saved in a way that breaks the link (switched to Assembly)', async () => {
    await savePart(housingWithWiderShoulder())
    await savePart({ ...housingWithWiderShoulder(), mode: 'assembly' })
    expect(recordedHousing(assembly()?.inputs).stack.upperDeviation).toBeCloseTo(0.22, 9)
  })

  it('records them in the assembly’s unsaved edits too, keeping the edits', async () => {
    await savePart(housingWithWiderShoulder())
    const edited = { ...readInputs.stackInputsFrom(assembly()?.inputs), resultName: 'End play (edited)' }
    drafts.setDraft(STACK_ASSEMBLY_EXAMPLE.id, { inputs: edited, summarize: () => null })
    await deletePart()
    const draft = drafts.draftOf(STACK_ASSEMBLY_EXAMPLE.id)?.inputs
    expect(readInputs.stackInputsFrom(draft).resultName).toBe('End play (edited)')
    expect(recordedHousing(draft).stack.upperDeviation).toBeCloseTo(0.22, 9)
  })

  it('leaves the assembly’s snapshot alone when the part was already gone', async () => {
    await deletePart()
    const once = assembly()?.inputs
    await dependents.refreshDependents([HOUSING_ID], library())
    expect(assembly()?.inputs).toEqual(once)
    // The seeded housing was the part's last saved result: the snapshot is the seeded one.
    expect(recordedHousing(once).stack.upperDeviation).toBeCloseTo(0.17, 9)
  })
})

describe('refreshStoredSummaries', () => {
  it('works out a summary saved by an older engine again, keeping the inputs and the time', async () => {
    const seeded = assembly()
    // As an older engine would have stored it: a stale status.
    store.applyChange((state) =>
      ok({ ...state, calculations: state.calculations.map((c) => (c.id === STACK_ASSEMBLY_EXAMPLE.id && c.summary ? { ...c, summary: { ...c.summary, status: 'fail' as const } } : c)) }),
    )
    expect(assembly()?.summary?.status).toBe('fail')
    await dependents.refreshStoredSummaries()
    expect(assembly()?.summary).toEqual(seeded?.summary)
    expect(assembly()?.updatedAt).toBe(seeded?.updatedAt)
    expect(assembly()?.inputs).toEqual(seeded?.inputs)
  })

  it('leaves the library as it is when every summary is current', async () => {
    const before = library()
    await dependents.refreshStoredSummaries()
    expect(library()).toBe(before)
  })
})
