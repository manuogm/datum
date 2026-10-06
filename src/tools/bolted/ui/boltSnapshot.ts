// What "Save revision" hands to a project: the joint or pattern on screen, its
// verdict, its headline numbers in SI, the complete inputs so the revision
// reopens exactly as saved, and the materials it uses for "Used in" on the
// Materials page. Both modes share the figure labels 'u max' and 'Governing',
// so a project's history compares revisions across them.
import type { SnapshotFigure, ToolSnapshot } from '../../../core/projects'
import { fail, ok, type Result } from '../../../core/result'
import { formatQuantity } from '../../../core/units'
import { analyseJoint, boltResults, materialIdsOf } from './logic/boltResults'
import { JOINT_KIND_LABELS, threadLabel } from './logic/labels'
import { formatUtilisation, governingCase, patternStatus, PROJECT_STATUS } from './logic/verdict'
import type { BoltInputs } from './state/boltInputs'


/** Fails, with the engine's explanation, when the inputs cannot be analysed. */
export function boltSnapshot(inputs: BoltInputs): Result<ToolSnapshot<BoltInputs>> {
  return inputs.mode === 'joint' ? jointSnapshot(inputs) : patternSnapshot(inputs)
}

function jointSnapshot(inputs: BoltInputs): Result<ToolSnapshot<BoltInputs>> {
  const analysis = analyseJoint(inputs, 'si')
  if (!analysis.ok) return analysis
  const { design } = inputs.joint
  const { summary, preload, steps } = analysis.value
  const bolt = `${threadLabel(design.thread)} ${design.propertyClass}`
  const governing = steps.find((s) => s.id === summary.governing)
  const figures: SnapshotFigure[] = [
    { label: 'Bolt', value: bolt },
    { label: 'u max', value: formatUtilisation(summary.utilisation) },
    { label: 'Governing', value: governing ? `${governing.rStep} ${governing.title}` : '—' },
    { label: 'MA', value: formatQuantity('torque', 'si', preload.tighteningTorqueNm), unit: 'N·m' },
  ]
  return ok({
    tool: 'bolt',
    title: `${bolt} ${JOINT_KIND_LABELS[design.joint.kind].toLowerCase()}`,
    status: PROJECT_STATUS[summary.status],
    figures,
    inputs,
    materialIds: materialIdsOf([design]),
  })
}

function patternSnapshot(inputs: BoltInputs): Result<ToolSnapshot<BoltInputs>> {
  const { pattern } = inputs
  const cases = boltResults(inputs, 'si').loadCases
  const governing = governingCase(cases)
  if (!governing.ok) return fail(governing.error)
  const { loadCase, bolt } = governing.value
  const analyses = cases.flatMap((c) => (c.analysis.ok ? [c.analysis.value] : []))
  return ok({
    tool: 'bolt',
    title: `${pattern.bolts.length}-bolt pattern, ${loadCase.id}`,
    status: PROJECT_STATUS[patternStatus(analyses)],
    figures: [
      { label: 'Bolts', value: String(pattern.bolts.length) },
      { label: 'u max', value: formatUtilisation(bolt.utilisation) },
      { label: 'Governing', value: `${bolt.bolt.id} (${bolt.bolt.jointTypeId}) in ${loadCase.id}` },
      { label: 'Load cases', value: String(pattern.loadCases.length) },
    ],
    inputs,
    materialIds: materialIdsOf(pattern.jointTypes.map((j) => j.design)),
  })
}
