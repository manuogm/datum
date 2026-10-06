// How engine results are named on screen: the modes, the status icon of an
// advisor check, the words for fit types, and the nominal size as a label.
import type { SegmentOption, Status } from '../../../../app/ui'
import { formatDecimal, toDisplay, type UnitSystem } from '../../../../core/units'
import type { CheckStatus } from '../../advisor'
import type { FitType } from '../../calc'
import type { FitMode } from '../state/fitInputs'

/** The modes offered on the first step: check a fit (calculator) or have the advisor choose one. */
export const FIT_MODES: readonly SegmentOption<FitMode>[] = [
  { value: 'calculator', label: 'I know the fit' },
  { value: 'advisor', label: 'Help me choose' },
]


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
