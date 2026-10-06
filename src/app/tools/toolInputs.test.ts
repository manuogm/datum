import { describe, expect, it } from 'vitest'
import { startingInputs, type ToolInputsCodec } from './toolInputs'

/** A codec that says where its inputs came from. */
const codec: ToolInputsCodec<string> = {
  decode: (query) => `link ${query}`,
  fromSaved: (saved) => `revision ${String(saved)}`,
  href: (inputs) => `#/tool?${inputs}`,
  fresh: (temp) => (temp ? `fresh ${temp.minC}…${temp.maxC}` : 'fresh'),
}
const projectServiceTempC = { minC: -30, maxC: 85 }

describe('startingInputs', () => {
  it('reopens a saved revision first', () => {
    expect(startingInputs(codec, { saved: 'A', query: 'd=10', projectServiceTempC })).toBe('revision A')
  })

  it('follows a shared link next, without project pre-fill', () => {
    expect(startingInputs(codec, { query: 'd=10', projectServiceTempC })).toBe('link d=10')
  })

  it("starts a fresh calculation at the active project's service temperatures", () => {
    expect(startingInputs(codec, { query: '', projectServiceTempC })).toBe('fresh -30…85')
    expect(startingInputs(codec, { query: '' })).toBe('fresh')
  })
})
