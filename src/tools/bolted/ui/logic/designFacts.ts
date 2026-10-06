// A joint's inputs as label–value lines for the report, in the viewer's units:
// the design alone (a pattern's joint type), or with the loads and service
// temperature of the single joint.
import { formatDecimal, formatQuantity, formatQuantityRange, type UnitSystem } from '../../../../core/units'
import { TIGHTENING_METHODS } from '../../calc'
import type { BoltInputs, JointDesignSpec } from '../state/boltInputs'
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
  const force = (n: number) => formatQuantity('force', system, n, { withUnit: true })
  return [
    ...designFacts(design, system),
    { label: 'FA,max / FA,min', value: `${force(loads.axialMaxN)} / ${force(loads.axialMinN)}`, mono: true },
    { label: 'FQ', value: `${force(loads.transverseN)}, ${loads.transverseVariation}`, mono: true },
    serviceTemperatureFact(serviceTempC, system),
  ]
}

export function serviceTemperatureFact(serviceTempC: BoltInputs['serviceTempC'], system: UnitSystem): DesignFact {
  return { label: 'Service temperature', value: formatQuantityRange('temperature', system, serviceTempC.minC, serviceTempC.maxC), mono: true }
}

/** Every input of a joint design; a part's pG only when entered (else the table value or the estimate from Rm). */
export function designFacts(design: JointDesignSpec, system: UnitSystem): DesignFact[] {
  const length = (mm: number) => formatQuantity('length', system, mm, { withUnit: true })
  const ratio = (value: number) => formatDecimal(value, 2, true)
  const pressure = (mpa: number) => formatQuantity('strength', system, mpa, { withUnit: true })
  const { joint } = design
  const into: DesignFact[] = joint.kind === 'through-bolt'
    ? [{ label: 'Joint', value: 'Through-bolt, ISO 4032 nut' }]
    : [
        { label: 'Joint', value: joint.kind === 'tapped' ? `Tapped into ${materialName(joint.materialId)}` : `${INSERT_LABELS[joint.insert]} insert in ${materialName(joint.materialId)}` },
        { label: joint.kind === 'tapped' ? 'Engagement' : 'Insert length', value: length(joint.engagementMm), mono: true },
        ...(joint.kind === 'insert'
          ? [insertThreadFact(joint)]
          : []),
      ]
  return [
    { label: 'Bolt', value: `${threadLabel(design.thread)} ${design.propertyClass}, ${HEAD_LABELS[design.headType].toLowerCase()}${design.washers ? ', ISO 7089 washers' : ''}` },
    ...into,
    ...design.plates.map((p, i) => ({
      label: `Part ${i + 1}`,
      value: `${materialName(p.materialId)}, ${length(p.thicknessMm)}${p.limitingPressureMPa === undefined ? '' : `, pG ${pressure(p.limitingPressureMPa)} entered`}`,
    })),
    { label: 'Outer diameter DA', value: length(design.outerDiameterMm), mono: true },
    { label: 'Tightening', value: `${TIGHTENING_LABELS[design.tightening]}, αA ${formatDecimal(TIGHTENING_METHODS[design.tightening].factor, 1, true)}` },
    { label: 'Friction µG / µK / µT', value: [design.threadFriction, design.headFriction, design.interfaceFriction].map(ratio).join(' / '), mono: true },
    { label: 'Slip interfaces qF', value: String(design.frictionInterfaces), mono: true },
    { label: 'Roughness', value: ROUGHNESS_LABELS[design.surfaceRoughness] },
    { label: 'Load introduction', value: LOAD_INTRODUCTION_LABELS[design.loadIntroduction] },
  ]
}

/** A Keensert needs its outer thread from the catalogue; a Helicoil without one uses the STI thread of the bolt. */
function insertThreadFact(joint: Extract<JointDesignSpec['joint'], { kind: 'insert' }>): DesignFact {
  if (joint.outerThread) return { label: 'Insert outer thread', value: threadDesignation(joint.outerThread), mono: true }
  const required = joint.insert === 'key-locking'
  return { label: 'Insert outer thread', value: required ? 'not given' : 'STI, from the bolt thread', mono: true, warn: required }
}
