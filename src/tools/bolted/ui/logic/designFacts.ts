// A joint's inputs as label–value lines for the report, in the viewer's units.
import { formatDecimal, formatQuantity, formatQuantityRange, type UnitSystem } from '../../../../core/units'
import { TIGHTENING_METHODS } from '../../calc'
import type { BoltInputs } from '../state/boltInputs'
import { threadDesignation } from './designEdits'
import { HEAD_LABELS, INSERT_LABELS, LOAD_INTRODUCTION_LABELS, materialName, ROUGHNESS_LABELS, threadLabel, TIGHTENING_LABELS } from './labels'

export interface DesignFact {
  readonly label: string
  readonly value: string
  readonly mono?: boolean
  /** A value a warning refers to: the missing insert outer thread. */
  readonly warn?: boolean
}

export function jointFacts({ joint: { design, loads }, serviceTempC }: BoltInputs, system: UnitSystem): DesignFact[] {
  const length = (mm: number) => formatQuantity('length', system, mm, { withUnit: true })
  const force = (n: number) => formatQuantity('force', system, n, { withUnit: true })
  const ratio = (value: number) => formatDecimal(value, 2, true)
  const { joint } = design
  const into: DesignFact[] = joint.kind === 'through-bolt'
    ? [{ label: 'Joint', value: 'Through-bolt, ISO 4032 nut' }]
    : [
        { label: 'Joint', value: joint.kind === 'tapped' ? `Tapped into ${materialName(joint.materialId)}` : `${INSERT_LABELS[joint.insert]} insert in ${materialName(joint.materialId)}` },
        { label: joint.kind === 'tapped' ? 'Engagement' : 'Insert length', value: length(joint.engagementMm), mono: true },
        ...(joint.kind === 'insert'
          ? [{ label: 'Insert outer thread', value: joint.outerThread ? threadDesignation(joint.outerThread) : 'not given', mono: true, warn: joint.outerThread === null }]
          : []),
      ]
  return [
    { label: 'Bolt', value: `${threadLabel(design.thread)} ${design.propertyClass}, ${HEAD_LABELS[design.headType].toLowerCase()}${design.washers ? ', ISO 7089 washers' : ''}` },
    ...into,
    ...design.plates.map((p, i) => ({ label: `Part ${i + 1}`, value: `${materialName(p.materialId)}, ${length(p.thicknessMm)}` })),
    { label: 'Outer diameter DA', value: length(design.outerDiameterMm), mono: true },
    { label: 'Tightening', value: `${TIGHTENING_LABELS[design.tightening]}, αA ${formatDecimal(TIGHTENING_METHODS[design.tightening].factor, 1, true)}` },
    { label: 'Friction µG / µK / µT', value: [design.threadFriction, design.headFriction, design.interfaceFriction].map(ratio).join(' / '), mono: true },
    { label: 'Roughness', value: ROUGHNESS_LABELS[design.surfaceRoughness] },
    { label: 'Load introduction', value: LOAD_INTRODUCTION_LABELS[design.loadIntroduction] },
    { label: 'FA,max / FA,min', value: `${force(loads.axialMaxN)} / ${force(loads.axialMinN)}`, mono: true },
    { label: 'FQ', value: `${force(loads.transverseN)}, ${loads.transverseVariation}`, mono: true },
    { label: 'Service temperature', value: formatQuantityRange('temperature', system, serviceTempC.minC, serviceTempC.maxC), mono: true },
  ]
}
