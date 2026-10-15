// The 12 geometric characteristics as the picker shows them (design §4.1),
// and the words that change with the drawing standard (§4.6).
import type { IconName } from '../../../../app/ui'
import { GEOMETRIC_RULES, type DrawingStandard, type GeometricCharacteristic, type MaterialBoundary, type MaterialCondition } from '../../calc'

export const CHARACTERISTIC_GROUPS: readonly { readonly label: string; readonly items: readonly GeometricCharacteristic[] }[] = [
  { label: 'Form', items: ['flatness', 'straightness'] },
  { label: 'Orientation', items: ['parallelism', 'perpendicularity', 'angularity'] },
  { label: 'Location', items: ['position', 'coaxiality', 'symmetry'] },
  { label: 'Profile', items: ['profile-surface', 'profile-line'] },
  { label: 'Runout', items: ['circular-runout', 'total-runout'] },
]

/** The drawn symbol of a characteristic (Icon.tsx). */
export const gdtIcon = (characteristic: GeometricCharacteristic): IconName => `gdt-${characteristic}`

/** "Position"; ◎ is "Coaxiality" on an ISO drawing and "Concentricity" on an ASME one (Y14.5-2009). */
export function characteristicName(characteristic: GeometricCharacteristic, standard: DrawingStandard): string {
  if (characteristic === 'coaxiality') return standard === 'iso' ? 'Coaxiality' : 'Concentricity'
  return GEOMETRIC_RULES[characteristic].name
}

export const STANDARD_NAME: Record<DrawingStandard, string> = { iso: 'ISO 1101', asme: 'ASME Y14.5' }

/** The material condition choices, in the drawing standard's words. */
export const MATERIAL_LABELS: Record<DrawingStandard, Record<MaterialCondition, string>> = {
  iso: { rfs: 'None', mmc: 'MMR', lmc: 'LMR' },
  asme: { rfs: 'RFS', mmc: 'MMC', lmc: 'LMC' },
}

/** The datum boundary choices: ISO "— · Ⓜ · Ⓛ", ASME "RMB · MMB · LMB". */
export const BOUNDARY_LABELS: Record<DrawingStandard, Record<MaterialBoundary, string>> = {
  iso: { rmb: '—', mmb: 'Ⓜ', lmb: 'Ⓛ' },
  asme: { rmb: 'RMB', mmb: 'MMB', lmb: 'LMB' },
}

/** The unequal-profile modifier: ISO UZ (with an offset), ASME Ⓤ (with a value). */
export const UNEQUAL_NAME: Record<DrawingStandard, string> = { iso: 'UZ', asme: 'Ⓤ' }
