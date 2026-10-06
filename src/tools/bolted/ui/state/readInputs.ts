// Reading Bolted Joint inputs that come from outside the screen: a shared
// calculation stored in the library. A malformed field keeps its default,
// so a calculation saved by an older Datum always opens; a malformed pattern (joint types,
// bolts and load cases belong together) falls back to the default pattern.
// Numbers are only checked for being numbers: the engine explains values it
// cannot use, next to the inputs.
import { materialById } from '../../../../core/materials'
import { PROPERTY_CLASSES, TIGHTENING_METHODS, type ThreadSize } from '../../calc'
import type { Vector3 } from '../../pattern'
import {
  DEFAULT_BOLT_INPUTS, DEFAULT_JOINT_DESIGN, DEFAULT_PATTERN, type BoltInputs, type JointDesignSpec, type JointKindSpec,
  type JointLoadSpec, type LoadCaseSpec, type PatternBoltSpec, type PatternJointTypeSpec, type PatternSpec, type PlateSpec,
} from './boltInputs'

type Fields = Record<string, unknown>

const isRecord = (value: unknown): value is Fields => typeof value === 'object' && value !== null && !Array.isArray(value)
const fields = (value: unknown): Fields => (isRecord(value) ? value : {})

const asNumber = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null)
const asText = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null)
const asBoolean = (value: unknown): boolean | null => (typeof value === 'boolean' ? value : null)

/** A value from a fixed list of options. */
const oneOf = <T extends string>(options: readonly T[]) => (value: unknown): T | null => options.find((option) => option === value) ?? null

const asMaterialId = (value: unknown): string | null => (typeof value === 'string' && materialById(value).ok ? value : null)

/** Every item valid (and at least one), or null. */
function asList<T>(value: unknown, item: (value: unknown) => T | null): T[] | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const items = value.map(item)
  return items.every((i) => i !== null) ? (items as T[]) : null
}

function asThread(value: unknown): Required<ThreadSize> | null {
  const thread = fields(value)
  const nominalMm = asNumber(thread.nominalMm)
  const pitchMm = asNumber(thread.pitchMm)
  return nominalMm !== null && pitchMm !== null ? { nominalMm, pitchMm } : null
}

function asPlate(value: unknown): PlateSpec | null {
  const plate = fields(value)
  const materialId = asMaterialId(plate.materialId)
  const thicknessMm = asNumber(plate.thicknessMm)
  const pG = asNumber(plate.limitingPressureMPa)
  if (materialId === null || thicknessMm === null) return null
  return pG === null ? { materialId, thicknessMm } : { materialId, thicknessMm, limitingPressureMPa: pG }
}

function asJointKind(value: unknown): JointKindSpec | null {
  const joint = fields(value)
  if (joint.kind === 'through-bolt') return { kind: 'through-bolt' }
  const materialId = asMaterialId(joint.materialId)
  const engagementMm = asNumber(joint.engagementMm)
  if (materialId === null || engagementMm === null) return null
  if (joint.kind === 'tapped') return { kind: 'tapped', materialId, engagementMm }
  const insert = oneOf(['helical-coil', 'key-locking'] as const)(joint.insert)
  if (joint.kind !== 'insert' || insert === null) return null
  return { kind: 'insert', insert, materialId, engagementMm, outerThread: joint.outerThread === null ? null : asThread(joint.outerThread) }
}

const asPropertyClass = oneOf(PROPERTY_CLASSES)
const asHeadType = oneOf(['hex', 'socket'] as const)
const asTightening = oneOf(Object.keys(TIGHTENING_METHODS) as JointDesignSpec['tightening'][])
const asRoughness = oneOf(['rz-below-10', 'rz-10-to-40', 'rz-40-to-160'] as const)
const asLoadIntroduction = oneOf(['near-head', 'middle', 'near-interface'] as const)
const asVariation = oneOf(['static', 'alternating'] as const)

function jointDesignFrom(value: unknown, d: JointDesignSpec = DEFAULT_JOINT_DESIGN): JointDesignSpec {
  const design = fields(value)
  return {
    thread: asThread(design.thread) ?? d.thread,
    propertyClass: asPropertyClass(design.propertyClass) ?? d.propertyClass,
    headType: asHeadType(design.headType) ?? d.headType,
    washers: asBoolean(design.washers) ?? d.washers,
    joint: asJointKind(design.joint) ?? d.joint,
    plates: asList(design.plates, asPlate) ?? d.plates,
    outerDiameterMm: asNumber(design.outerDiameterMm) ?? d.outerDiameterMm,
    tightening: asTightening(design.tightening) ?? d.tightening,
    threadFriction: asNumber(design.threadFriction) ?? d.threadFriction,
    headFriction: asNumber(design.headFriction) ?? d.headFriction,
    interfaceFriction: asNumber(design.interfaceFriction) ?? d.interfaceFriction,
    frictionInterfaces: asNumber(design.frictionInterfaces) ?? d.frictionInterfaces,
    surfaceRoughness: asRoughness(design.surfaceRoughness) ?? d.surfaceRoughness,
    loadIntroduction: asLoadIntroduction(design.loadIntroduction) ?? d.loadIntroduction,
  }
}

function jointLoadsFrom(value: unknown): JointLoadSpec {
  const loads = fields(value)
  const d = DEFAULT_BOLT_INPUTS.joint.loads
  return {
    axialMaxN: asNumber(loads.axialMaxN) ?? d.axialMaxN,
    axialMinN: asNumber(loads.axialMinN) ?? d.axialMinN,
    transverseN: asNumber(loads.transverseN) ?? d.transverseN,
    transverseVariation: asVariation(loads.transverseVariation) ?? d.transverseVariation,
  }
}

function asVector(value: unknown): Vector3 | null {
  const v = fields(value)
  const [x, y, z] = [v.x, v.y, v.z].map(asNumber)
  return x !== null && y !== null && z !== null ? { x, y, z } : null
}

function asLoadCase(value: unknown): LoadCaseSpec | null {
  const c = fields(value)
  const [id, name] = [asText(c.id), typeof c.name === 'string' ? c.name : null]
  const [forceN, momentNm, loadPointMm] = [c.forceN, c.momentNm, c.loadPointMm].map(asVector)
  return id && name !== null && forceN && momentNm && loadPointMm ? { id, name, forceN, momentNm, loadPointMm } : null
}

function asJointTypeSpec(value: unknown): PatternJointTypeSpec | null {
  const j = fields(value)
  const id = asText(j.id)
  // A joint type without a design is not a joint type; one with odd fields keeps their defaults.
  return id && isRecord(j.design) ? { id, design: jointDesignFrom(j.design) } : null
}

function asBolt(value: unknown): PatternBoltSpec | null {
  const b = fields(value)
  const [id, jointTypeId] = [asText(b.id), asText(b.jointTypeId)]
  const [xMm, yMm] = [asNumber(b.xMm), asNumber(b.yMm)]
  return id && jointTypeId && xMm !== null && yMm !== null ? { id, xMm, yMm, jointTypeId } : null
}

function patternFrom(value: unknown): PatternSpec {
  const p = fields(value)
  const jointTypes = asList(p.jointTypes, asJointTypeSpec)
  const bolts = asList(p.bolts, asBolt)
  const loadCases = asList(p.loadCases, asLoadCase)
  if (!jointTypes || !bolts || !loadCases) return DEFAULT_PATTERN
  if (!bolts.every((bolt) => jointTypes.some((j) => j.id === bolt.jointTypeId))) return DEFAULT_PATTERN
  const loadCaseId = loadCases.find((c) => c.id === p.loadCaseId)?.id ?? loadCases[0].id
  return { jointTypes, bolts, loadCases, loadCaseId }
}

/** Inputs stored in the library (normally a complete BoltInputs; null for the example). */
export function boltInputsFrom(value: unknown): BoltInputs {
  const saved = fields(value)
  const d = DEFAULT_BOLT_INPUTS
  const temp = fields(saved.serviceTempC)
  const [minC, maxC] = [asNumber(temp.minC), asNumber(temp.maxC)]
  const joint = fields(saved.joint)
  return {
    mode: oneOf(['joint', 'pattern'] as const)(saved.mode) ?? d.mode,
    serviceTempC: minC !== null && maxC !== null ? { minC, maxC } : d.serviceTempC,
    joint: { design: jointDesignFrom(joint.design), loads: jointLoadsFrom(joint.loads) },
    pattern: saved.pattern === undefined ? d.pattern : patternFrom(saved.pattern),
  }
}
