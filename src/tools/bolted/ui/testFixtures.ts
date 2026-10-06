// Inputs for the bolted UI tests.
import { DEFAULT_BOLT_INPUTS, DEFAULT_PATTERN, type BoltInputs, type JointKindSpec } from './state/boltInputs'

/** The default pattern with its J4 changed to a key-locking insert of the given outer thread. */
function patternWithKeensert(outerThread: Extract<JointKindSpec, { kind: 'insert' }>['outerThread']): BoltInputs {
  const keensert: JointKindSpec = { kind: 'insert', insert: 'key-locking', materialId: 'al-7075-t6', engagementMm: 8, outerThread }
  return {
    ...DEFAULT_BOLT_INPUTS,
    mode: 'pattern',
    pattern: {
      ...DEFAULT_PATTERN,
      jointTypes: DEFAULT_PATTERN.jointTypes.map((j) => (j.id === 'J4' ? { ...j, design: { ...j.design, joint: keensert } } : j)),
    },
  }
}

/** J4 a Keensert with an outer thread of M6×1 (an assumed catalogue value, for tests only). */
export const PATTERN_WITH_KEENSERT = patternWithKeensert({ nominalMm: 6, pitchMm: 1 })

/** J4 a Keensert whose outer thread has not been entered: no load case can be analysed. */
export const PATTERN_MISSING_THREAD = patternWithKeensert(null)
