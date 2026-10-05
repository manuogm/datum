import { MATERIAL_FAMILIES } from '../../../core/materials'
import { parentShearStrengthMPa } from './engagement'
import { EMBEDDING_UM, LOAD_INTRODUCTION_FACTOR, TIGHTENING_METHODS } from './rules'
import type { BoltedJointInput, JointMaterial } from './types'

/**
 * Checks a joint input before any calculation. Returns a plain-English
 * explanation of the first problem found, or null when the input is usable.
 * Thread size, pitch and property class are checked by their lookups.
 */
export function inputError(input: BoltedJointInput): string | null {
  return designError(input) ?? loadsError(input)
}

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const isPositive = (value: unknown) => isFiniteNumber(value) && value > 0
const isFraction = (value: unknown) => isFiniteNumber(value) && value > 0 && value <= 1

function materialError(material: JointMaterial, role: string): string | null {
  if (!(material.family in MATERIAL_FAMILIES)) return `The ${role} material "${material.name}" has an unknown material family.`
  if (!isPositive(material.youngsModulusGPa)) return `The ${role} material "${material.name}" needs a Young's modulus above zero.`
  if (!isFiniteNumber(material.thermalExpansionUmPerMK)) return `The ${role} material "${material.name}" needs a thermal expansion coefficient.`
  if (material.limitingSurfacePressureMPa !== undefined && !isPositive(material.limitingSurfacePressureMPa)) {
    return `The limiting surface pressure of "${material.name}" must be above zero.`
  }
  return null
}

function designError(input: BoltedJointInput): string | null {
  if (input.headType !== 'hex' && input.headType !== 'socket') return 'The head type must be hexagon or socket head.'
  if (input.plates.length === 0) return 'Add at least one clamped part.'
  for (const [index, plate] of input.plates.entries()) {
    if (!isPositive(plate.thicknessMm)) return `Clamped part ${index + 1} needs a thickness above zero.`
    const error = materialError(plate.material, `clamped part ${index + 1}`)
    if (error) return error
  }
  if (input.shankLengthMm !== undefined && !(isFiniteNumber(input.shankLengthMm) && input.shankLengthMm >= 0)) {
    return 'The shank length must be zero or more.'
  }
  if (!isPositive(input.outerDiameterMm)) return 'The outer diameter DA of the clamped parts must be above zero.'
  if ('method' in input.tightening ? !(input.tightening.method in TIGHTENING_METHODS)
    : !(isFiniteNumber(input.tightening.tighteningFactor) && input.tightening.tighteningFactor >= 1)) {
    return 'Choose a tightening method, or give a tightening factor αA of 1 or more.'
  }
  if (input.utilisation !== undefined && !isFraction(input.utilisation)) return 'The utilisation ν must be above 0 and at most 1 (100 % of Rp0.2).'
  const frictions = [input.threadFriction, input.headFriction, input.interfaceFriction]
  if (!frictions.every((mu) => isFiniteNumber(mu) && mu > 0 && mu < 1)) return 'Friction coefficients µG, µK and µT must be between 0 and 1.'
  if (input.frictionInterfaces !== undefined && !(Number.isInteger(input.frictionInterfaces) && input.frictionInterfaces >= 1)) {
    return 'The number of friction interfaces qF must be a whole number, 1 or more.'
  }
  if (!(input.surfaceRoughness in EMBEDDING_UM)) return 'Choose the surface roughness Rz of the contact faces.'
  if ('position' in input.loadIntroduction ? !(input.loadIntroduction.position in LOAD_INTRODUCTION_FACTOR)
    : !(isFiniteNumber(input.loadIntroduction.factor) && input.loadIntroduction.factor >= 0 && input.loadIntroduction.factor <= 1)) {
    return 'Choose where the load is introduced, or give a load introduction factor n from 0 to 1.'
  }
  if (input.serviceTempC && !(isFiniteNumber(input.serviceTempC.minC) && isFiniteNumber(input.serviceTempC.maxC)
    && input.serviceTempC.minC <= input.serviceTempC.maxC)) {
    return 'The service temperature range must go from the lower to the higher temperature.'
  }
  if (input.assemblyTempC !== undefined && !isFiniteNumber(input.assemblyTempC)) return 'The assembly temperature must be a number.'
  return jointTypeError(input)
}

function jointTypeError({ joint, thread }: BoltedJointInput): string | null {
  if (joint.kind === 'through-bolt') return null
  if (joint.kind !== 'tapped' && joint.kind !== 'insert') return 'The joint type must be a through-bolt, a tapped thread or a thread insert.'
  if (!isPositive(joint.engagementMm)) return 'The length of thread engagement must be above zero.'
  const error = materialError(joint.material, 'tapped part')
  if (error) return error
  if (parentShearStrengthMPa(joint.material) === null) {
    return `Thread engagement in ${joint.material.name} cannot be assessed: tapped threads are covered for metals with a known tensile strength Rm.`
  }
  if (joint.kind === 'tapped') return null
  if (joint.insert !== 'helical-coil' && joint.insert !== 'key-locking') return 'The insert type must be helical-coil or key-locking.'
  if (joint.outerThread === undefined) {
    return joint.insert === 'key-locking' ? 'Give the outer thread of the key-locking insert (from the insert catalogue).' : null
  }
  return isPositive(joint.outerThread.pitchMm) && isFiniteNumber(joint.outerThread.nominalMm) && joint.outerThread.nominalMm > thread.nominalMm
    ? null
    : 'The outer thread of the insert must be larger than the bolt thread, with a pitch above zero.'
}

function loadsError({ loads }: BoltedJointInput): string | null {
  const { axialMaxN, axialMinN = 0, transverseN = 0, torqueNm = 0, frictionRadiusMm, minClampForceN = 0, transverseVariation } = loads
  if (![axialMaxN, axialMinN].every(isFiniteNumber)) return 'The axial loads must be numbers.'
  if (axialMinN > axialMaxN) return 'The smallest axial load FA,min must not exceed the largest, FA,max.'
  if (!(isFiniteNumber(transverseN) && transverseN >= 0)) return 'The transverse load FQ must be zero or more.'
  if (!(isFiniteNumber(torqueNm) && torqueNm >= 0)) return 'The torque about the bolt axis must be zero or more.'
  if (frictionRadiusMm !== undefined && !isPositive(frictionRadiusMm)) return 'The friction radius must be above zero.'
  if (!(isFiniteNumber(minClampForceN) && minClampForceN >= 0)) return 'The minimum clamp load must be zero or more.'
  if (transverseVariation !== undefined && transverseVariation !== 'static' && transverseVariation !== 'alternating') {
    return 'The transverse load must be static or alternating.'
  }
  return null
}
