// What both Bolted Joint reports print the same way: the standards in the
// footer, the verdict words of the summary strip and the units line.
import type { ReportStatus } from '../../../../app/report'
import { unitOf, type Quantity, type UnitSystem } from '../../../../core/units'

export const STANDARDS = 'VDI 2230-1:2015, ISO 898-1, ISO 4014/4032/4762, ISO 7089'

export const STATUS_HEADLINE: Record<ReportStatus, string> = {
  pass: 'Passes VDI 2230',
  review: 'Review',
  fail: 'Fails VDI 2230',
}

const REPORTED: readonly Quantity[] = ['length', 'force', 'torque', 'strength', 'temperature']

/** 'SI (mm, kN, N·m, MPa, °C)' */
export const unitsLine = (system: UnitSystem) => `${system === 'si' ? 'SI' : 'Imperial'} (${REPORTED.map((q) => unitOf(q, system)).join(', ')})`
