// How engine verdicts are shown: the status icon for an in-service verdict or
// an advisor check, the words for fit types, and the nominal size as a label.
import type { Status } from '../../../../app/ui'
import { formatDecimal, toDisplay, type UnitSystem } from '../../../../core/units'
import type { CheckStatus } from '../../advisor'
import type { FitType } from '../../calc'
import type { FitStatus } from '../logic/serviceClearance'

export const STATUS_ICON: Record<FitStatus, Status> = { pass: 'ok', review: 'warn', fail: 'bad' }

export const STATUS_TITLE: Record<FitStatus, string> = {
  pass: 'Within the required window in service',
  review: 'Partly outside the required window',
  fail: 'Outside the required window',
}

export const CHECK_ICON: Record<CheckStatus, Status> = { pass: 'ok', warn: 'warn', fail: 'bad' }

export const FIT_TYPE_LABEL: Record<FitType, string> = {
  clearance: 'Clearance',
  transition: 'Transition',
  interference: 'Interference',
}

/** 'Ø25' (millimetres understood, as on drawings) or 'Ø0.9843 in'. */
export function nominalLabel(nominalMm: number, system: UnitSystem): string {
  return system === 'si' ? `Ø${formatDecimal(nominalMm, 3)}` : `Ø${formatDecimal(toDisplay('length', system, nominalMm), 4)} in`
}
