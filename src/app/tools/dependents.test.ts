import { beforeAll, describe, expect, it, vi } from 'vitest'
import { STACK_ASSEMBLY_EXAMPLE, findCalculation } from '../../core/library'

// The library lives in the browser: give it a window with an in-memory
// localStorage before loading it. It starts as the seeded library.
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
let dependents: typeof import('./dependents')

beforeAll(async () => {
  store = await import('../library/libraryStore')
  actions = (await import('../library/useLibrary')).libraryActions
  dependents = await import('./dependents')
})

const HOUSING_ID = 'example-stack'
const assembly = () => findCalculation(store.getSnapshot().state, STACK_ASSEMBLY_EXAMPLE.id)

/** The housing example with its shoulder depth at ±0.1 instead of ±0.05. */
async function housingWithWiderShoulder(): Promise<unknown> {
  const { EXAMPLE_STACK_INPUTS } = await import('../../tools/stackup/ui/state/stackInputs')
  return {
    ...EXAMPLE_STACK_INPUTS,
    rows: EXAMPLE_STACK_INPUTS.rows.map((row, i) => (i === 0 && row.kind === 'dimension' ? { ...row, tolerance: { kind: 'symmetric', plusMinus: 0.1 } } : row)),
  }
}

describe('an assembly that links a part stack', () => {
  it('gets its summary on Home worked out again when the part is saved, keeping its own inputs and time', async () => {
    const before = assembly()
    expect(before?.summary).toEqual(STACK_ASSEMBLY_EXAMPLE.summary)
    actions.saveCalculation(HOUSING_ID, await housingWithWiderShoulder(), null)
    await dependents.refreshDependents([HOUSING_ID])
    const after = assembly()
    // ±0.05 more on the housing widens the end play by 0.05 on each side.
    expect(after?.summary?.figures[0]).toEqual({ label: 'WC', value: '−0.005 … 0.605', unit: 'mm' })
    expect(after?.summary?.status).toBe('review')
    expect(after?.inputs).toEqual(before?.inputs)
    expect(after?.updatedAt).toBe(before?.updatedAt)
  })

  it('falls back on the last known values when the part is deleted', async () => {
    actions.deleteCalculation(HOUSING_ID)
    await dependents.refreshDependents([HOUSING_ID])
    // The assembly last saw the seeded housing: its figures are as seeded, its status capped at review.
    expect(assembly()?.summary).toEqual(STACK_ASSEMBLY_EXAMPLE.summary)
  })
})
