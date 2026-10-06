// How the Bolted Joint inputs change. Every edit on the screen is one of
// these actions; the reducer is pure so it can be tested on its own.
import type { BoltInputs, JointDesignSpec, JointLoadSpec, LoadCaseSpec, PatternBoltSpec, PatternSpec } from './boltInputs'

/** Which joint design an edit is for: the single joint, or a joint type of the pattern. */
export type DesignTarget = { readonly scope: 'joint' } | { readonly scope: 'jointType'; readonly id: string }

export type BoltAction =
  /** Plain edits of top-level fields (mode, service temperature), or all inputs at once. */
  | { type: 'change'; changes: Partial<BoltInputs> }
  | { type: 'design'; target: DesignTarget; changes: Partial<JointDesignSpec> }
  | { type: 'loads'; changes: Partial<JointLoadSpec> }
  /** Show another load case. */
  | { type: 'selectLoadCase'; id: string }
  | { type: 'loadCase'; id: string; changes: Partial<Omit<LoadCaseSpec, 'id'>> }
  /** A copy of the load case on screen, shown next. */
  | { type: 'addLoadCase' }
  | { type: 'removeLoadCase'; id: string }
  /** A copy of a joint type, to edit into a new one. */
  | { type: 'addJointType'; copyOf: string }
  /** Only a joint type no bolt uses can go. */
  | { type: 'removeJointType'; id: string }
  | { type: 'bolt'; id: string; changes: Partial<Omit<PatternBoltSpec, 'id'>> }
  | { type: 'addBolt' }
  | { type: 'removeBolt'; id: string }

export function boltReducer(inputs: BoltInputs, action: BoltAction): BoltInputs {
  const pattern = (change: (p: PatternSpec) => PatternSpec): BoltInputs => ({ ...inputs, pattern: change(inputs.pattern) })
  switch (action.type) {
    case 'change':
      return { ...inputs, ...action.changes }
    case 'design':
      return withDesign(inputs, action.target, action.changes)
    case 'loads':
      return { ...inputs, joint: { ...inputs.joint, loads: { ...inputs.joint.loads, ...action.changes } } }
    case 'selectLoadCase':
      return pattern((p) => ({ ...p, loadCaseId: action.id }))
    case 'loadCase':
      return pattern((p) => ({ ...p, loadCases: p.loadCases.map((c) => (c.id === action.id ? { ...c, ...action.changes } : c)) }))
    case 'addLoadCase':
      return pattern(addLoadCase)
    case 'removeLoadCase':
      return pattern((p) => removeLoadCase(p, action.id))
    case 'addJointType':
      return pattern((p) => addJointType(p, action.copyOf))
    case 'removeJointType':
      return pattern((p) =>
        p.bolts.some((b) => b.jointTypeId === action.id) || p.jointTypes.length === 1
          ? p
          : { ...p, jointTypes: p.jointTypes.filter((j) => j.id !== action.id) })
    case 'bolt':
      return pattern((p) => ({ ...p, bolts: p.bolts.map((b) => (b.id === action.id ? { ...b, ...action.changes } : b)) }))
    case 'addBolt':
      return pattern(addBolt)
    case 'removeBolt':
      return pattern((p) => (p.bolts.length === 1 ? p : { ...p, bolts: p.bolts.filter((b) => b.id !== action.id) }))
  }
}

function withDesign(inputs: BoltInputs, target: DesignTarget, changes: Partial<JointDesignSpec>): BoltInputs {
  if (target.scope === 'joint') return { ...inputs, joint: { ...inputs.joint, design: { ...inputs.joint.design, ...changes } } }
  const jointTypes = inputs.pattern.jointTypes.map((j) => (j.id === target.id ? { ...j, design: { ...j.design, ...changes } } : j))
  return { ...inputs, pattern: { ...inputs.pattern, jointTypes } }
}

/** The next free id with a prefix: 'J5' after J1 … J4. */
export function nextId(prefix: string, ids: readonly string[]): string {
  const numbers = ids.map((id) => Number(id.slice(prefix.length))).filter(Number.isInteger)
  return `${prefix}${Math.max(0, ...numbers) + 1}`
}

function addLoadCase(p: PatternSpec): PatternSpec {
  const source = p.loadCases.find((c) => c.id === p.loadCaseId) ?? p.loadCases[0]
  const id = nextId('LC', p.loadCases.map((c) => c.id))
  return { ...p, loadCases: [...p.loadCases, { ...source, id, name: `Copy of ${source.name}` }], loadCaseId: id }
}

function removeLoadCase(p: PatternSpec, id: string): PatternSpec {
  if (p.loadCases.length === 1) return p
  const loadCases = p.loadCases.filter((c) => c.id !== id)
  return { ...p, loadCases, loadCaseId: p.loadCaseId === id ? loadCases[0].id : p.loadCaseId }
}

function addJointType(p: PatternSpec, copyOf: string): PatternSpec {
  const source = p.jointTypes.find((j) => j.id === copyOf) ?? p.jointTypes[0]
  return { ...p, jointTypes: [...p.jointTypes, { id: nextId('J', p.jointTypes.map((j) => j.id)), design: source.design }] }
}

/** A new bolt of the first joint type, beside the rightmost bolt. */
function addBolt(p: PatternSpec): PatternSpec {
  const rightmost = p.bolts.reduce((a, b) => (b.xMm > a.xMm ? b : a))
  const bolt = { id: nextId('B', p.bolts.map((b) => b.id)), xMm: rightmost.xMm + 20, yMm: rightmost.yMm, jointTypeId: p.jointTypes[0].id }
  return { ...p, bolts: [...p.bolts, bolt] }
}
