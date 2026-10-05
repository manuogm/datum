// Inputs for the bolted UI tests.
import { DEFAULT_BOLT_INPUTS, DEFAULT_PATTERN, type BoltInputs } from './state/boltInputs'

/**
 * The default pattern with an outer thread entered for its key-locking insert
 * (M6×1: an assumed catalogue value, for tests only), so every load case can
 * be analysed.
 */
export const PATTERN_WITH_KEENSERT: BoltInputs = {
  ...DEFAULT_BOLT_INPUTS,
  mode: 'pattern',
  pattern: {
    ...DEFAULT_PATTERN,
    jointTypes: DEFAULT_PATTERN.jointTypes.map((j) =>
      j.design.joint.kind === 'insert' && j.design.joint.insert === 'key-locking'
        ? { ...j, design: { ...j.design, joint: { ...j.design.joint, outerThread: { nominalMm: 6, pitchMm: 1 } } } }
        : j),
  },
}
