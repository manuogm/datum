// What the library lists about a bolted joint calculation: the joint or
// pattern on screen (in the title), its verdict, its headline numbers in SI
// and the complete inputs. Both modes lead with 'u max' and 'Governing'.
import type { SnapshotFigure, ToolSnapshot } from '../../../core/library'
import { fail, ok, type Result } from '../../../core/result'
import { formatQuantity } from '../../../core/units'
import { analyseJoint, boltResults } from './logic/boltResults'
import { JOINT_KIND_LABELS, threadLabel } from './logic/labels'
import { CALCULATION_STATUS, formatUtilisation, governingCase, patternStatus, verdictCheck } from './logic/verdict'
import type { BoltInputs } from './state/boltInputs'


/** Fails, with the engine's explanation, when the inputs cannot be analysed. */
export function boltSnapshot(inputs: BoltInputs): Result<ToolSnapshot<BoltInputs>> {
  return inputs.mode === 'joint' ? jointSnapshot(inputs) : patternSnapshot(inputs)
}

function jointSnapshot(inputs: BoltInputs): Result<ToolSnapshot<BoltInputs>> {
  const analysis = analyseJoint(inputs, 'si')
  if (!analysis.ok) return analysis
  const { design } = inputs.joint
  const { summary, preload } = analysis.value
  const bolt = `${threadLabel(design.thread)} ${design.propertyClass}`
  // The check behind the status: R10 for a REVIEW on a part without pG, though R8 is more utilised.
  const governing = verdictCheck(analysis.value)
  const figures: SnapshotFigure[] = [
    { label: 'u max', value: formatUtilisation(summary.utilisation) },
    { label: 'Governing', value: governing ? `${governing.rStep} ${governing.title}` : '—' },
    { label: 'MA', value: formatQuantity('torque', 'si', preload.tighteningTorqueNm), unit: 'N·m' },
  ]
  return ok({
    tool: 'bolt',
    title: `${bolt} ${JOINT_KIND_LABELS[design.joint.kind].toLowerCase()}`,
    status: CALCULATION_STATUS[summary.status],
    figures,
    inputs,
  })
}

function patternSnapshot(inputs: BoltInputs): Result<ToolSnapshot<BoltInputs>> {
  const { pattern } = inputs
  const cases = boltResults(inputs, 'si').loadCases
  const governing = governingCase(cases)
  if (!governing.ok) return fail(governing.error)
  const { loadCase, bolt, maxUtilisation } = governing.value
  const check = verdictCheck(bolt.analysis)
  const analyses = cases.flatMap((c) => (c.analysis.ok ? [c.analysis.value] : []))
  return ok({
    tool: 'bolt',
    title: `${pattern.bolts.length}-bolt pattern, ${loadCase.id}`,
    status: CALCULATION_STATUS[patternStatus(analyses)],
    figures: [
      { label: 'u max', value: formatUtilisation(maxUtilisation) },
      { label: 'Governing', value: `${bolt.bolt.id} (${bolt.bolt.jointTypeId}) in ${loadCase.id}${check ? `, ${check.rStep}` : ''}` },
      { label: 'Load cases', value: String(pattern.loadCases.length) },
    ],
    inputs,
  })
}
