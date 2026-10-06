import { describe, expect, it } from 'vitest'
import { forget, recall, remember } from './sessionMemory'
import { INITIAL_STEP_FLOW, canGoToStep, fitStepFlow, stepFlowReducer, stepIndex, stepStatus, type StepFlowState } from './stepFlow'

const COUNT = 4
const run = (state: StepFlowState, ...actions: Parameters<typeof stepFlowReducer>[1][]) =>
  actions.reduce((s, action) => stepFlowReducer(s, action, COUNT), state)

describe('stepFlowReducer', () => {
  it('moves forward with next and records the furthest step reached', () => {
    expect(run(INITIAL_STEP_FLOW, { type: 'next' }, { type: 'next' })).toEqual({ current: 2, reached: 2 })
  })

  it('stops at the last and first steps', () => {
    expect(run(INITIAL_STEP_FLOW, { type: 'back' })).toEqual(INITIAL_STEP_FLOW)
    const end = run(INITIAL_STEP_FLOW, { type: 'next' }, { type: 'next' }, { type: 'next' }, { type: 'next' })
    expect(end).toEqual({ current: 3, reached: 3 })
  })

  it('keeps the reached step when going back, so later steps stay clickable', () => {
    const state = run(INITIAL_STEP_FLOW, { type: 'next' }, { type: 'next' }, { type: 'goTo', index: 0 })
    expect(state).toEqual({ current: 0, reached: 2 })
    expect(run(state, { type: 'goTo', index: 2 })).toEqual({ current: 2, reached: 2 })
  })

  it('refuses to jump past the step after the furthest reached', () => {
    const state = run(INITIAL_STEP_FLOW, { type: 'goTo', index: 3 })
    expect(state).toEqual(INITIAL_STEP_FLOW)
    expect(run(INITIAL_STEP_FLOW, { type: 'goTo', index: 1 })).toEqual({ current: 1, reached: 1 })
  })

  it('ignores indices outside the flow', () => {
    expect(run(INITIAL_STEP_FLOW, { type: 'goTo', index: -1 })).toEqual(INITIAL_STEP_FLOW)
    expect(run(INITIAL_STEP_FLOW, { type: 'goTo', index: 1.5 })).toEqual(INITIAL_STEP_FLOW)
  })

  it('reachAll opens every step, landing on the last or a chosen one', () => {
    expect(run(INITIAL_STEP_FLOW, { type: 'reachAll' })).toEqual({ current: 3, reached: 3 })
    expect(run(INITIAL_STEP_FLOW, { type: 'reachAll', index: 1 })).toEqual({ current: 1, reached: 3 })
  })

  it('reset starts over', () => {
    expect(run({ current: 2, reached: 3 }, { type: 'reset' })).toEqual(INITIAL_STEP_FLOW)
  })
})

describe('fitStepFlow', () => {
  it('clamps a state to a shorter flow (a mode with fewer steps)', () => {
    expect(fitStepFlow({ current: 4, reached: 5 }, 3)).toEqual({ current: 2, reached: 2 })
  })

  it('returns the same state when it already fits', () => {
    const state = { current: 1, reached: 2 }
    expect(fitStepFlow(state, 4)).toBe(state)
  })
})

describe('stepStatus and canGoToStep', () => {
  const state = { current: 1, reached: 2 }

  it('marks reached steps done, the shown one current, the rest upcoming', () => {
    expect([0, 1, 2, 3].map((i) => stepStatus(state, i))).toEqual(['done', 'current', 'done', 'upcoming'])
  })

  it('allows reached steps and the one after the furthest', () => {
    expect([0, 1, 2, 3, 4].map((i) => canGoToStep(state, i, COUNT))).toEqual([true, true, true, true, false])
    expect(canGoToStep(INITIAL_STEP_FLOW, 2, COUNT)).toBe(false)
  })
})

describe('stepIndex', () => {
  it('finds a step by id', () => {
    const steps = [
      { id: 'geometry', label: 'Geometry' },
      { id: 'results', label: 'Results' },
    ]
    expect(stepIndex(steps, 'results')).toBe(1)
    expect(stepIndex(steps, 'loads')).toBe(-1)
  })
})

describe('sessionMemory', () => {
  it('recalls a remembered value and falls back otherwise', () => {
    remember('test:fit:details', true)
    expect(recall('test:fit:details', false)).toBe(true)
    expect(recall('test:bolt:details', false)).toBe(false)
  })

  it('forgets by prefix', () => {
    remember('test:lam:a', 1)
    remember('test:lam:b', 2)
    remember('test:other', 3)
    forget('test:lam:')
    expect(recall('test:lam:a', 0)).toBe(0)
    expect(recall('test:lam:b', 0)).toBe(0)
    expect(recall('test:other', 0)).toBe(3)
  })
})
