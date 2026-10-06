import { describe, expect, it } from 'vitest'
import { DRAFT } from '../../core/projects/testData'
import { startingInputs, type ToolInputsCodec } from './toolInputs'

/** A codec that says where its inputs came from. */
const codec: ToolInputsCodec<string> = {
  decode: (query) => `link ${query}`,
  fromSaved: (saved) => `revision ${String(saved)}`,
  href: (inputs) => `#/tool?${inputs}`,
  fresh: (targets) => (targets ? `fresh ${targets.serviceTempMinC}…${targets.serviceTempMaxC}` : 'fresh'),
}
const projectTargets = DRAFT.targets

describe('startingInputs', () => {
  it('reopens a saved revision first', () => {
    expect(startingInputs(codec, { saved: 'A', query: 'd=10', projectTargets })).toBe('revision A')
  })

  it('follows a shared link next, without project pre-fill', () => {
    expect(startingInputs(codec, { query: 'd=10', projectTargets })).toBe('link d=10')
  })

  it("starts a fresh calculation with the active project's design targets", () => {
    expect(startingInputs(codec, { query: '', projectTargets })).toBe('fresh -20…160')
    expect(startingInputs(codec, { query: '' })).toBe('fresh')
  })
})
