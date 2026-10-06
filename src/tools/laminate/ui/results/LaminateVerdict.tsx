// Depth 1 of the results: the first-ply failure verdict. One sentence on the
// critical plies and how many plies meet the target, the lowest reserve
// factor against the target, then the load at first-ply failure and the
// laminate's in-plane moduli.
import type { ReactNode } from 'react'
import { VerdictCard, type VerdictFigure } from '../../../../app/ui'
import { formatQuantity, unitOf, type UnitSystem } from '../../../../core/units'
import type { LaminateAnalysis } from '../../calc'
import { CRITERION_LABELS, formatFactor } from '../logic/labels'
import { failureLoadNote, leadingLoad } from '../logic/loads'
import { constantViews } from '../logic/stiffness'
import { laminateStatus, plyCountText, plyTones, verdictSentence } from '../logic/verdict'

interface LaminateVerdictProps {
  analysis: LaminateAnalysis
  system: UnitSystem
  /** Under the figures: "Optimise layup". */
  actions?: ReactNode
}

/** The moduli the verdict quotes, by symbol, with their short names. */
const MODULI: readonly (readonly [symbol: string, label: string])[] = [
  ['Ex', 'Modulus'],
  ['Ey', 'Modulus'],
  ['Gxy', 'Shear modulus'],
]

export function LaminateVerdict({ analysis, system, actions }: LaminateVerdictProps) {
  const { firstPlyFailure, constants } = analysis
  const load = leadingLoad(firstPlyFailure.loads)
  const views = constantViews(constants, system)
  // With B ≠ 0 the plate constants are apparent values: say so on each.
  const moduli = MODULI.map(([symbol, label]): VerdictFigure => {
    const view = views.find((c) => c.symbol === symbol)
    return { label: constants.apparent ? `Apparent ${label.toLowerCase()}` : label, symbol, value: view?.value, unit: view?.unit }
  })
  const failureLoad: VerdictFigure[] = load
    ? [{ label: 'FPF load', symbol: load.symbol, value: formatQuantity(load.quantity, system, firstPlyFailure.loads[load.key]), unit: unitOf(load.quantity, system) }]
    : []
  // How many plies meet the target, then the rest of the failure load.
  const detail = Number.isFinite(firstPlyFailure.reserveFactor)
    ? [plyCountText(plyTones(analysis)), failureLoadNote(firstPlyFailure.loads, system)].filter(Boolean).join(' · ')
    : undefined
  return (
    <VerdictCard
      status={laminateStatus(firstPlyFailure)}
      sentence={verdictSentence(analysis)}
      detail={detail}
      reference={`CLT · ${CRITERION_LABELS[analysis.criterion]}`}
      headline={{ label: 'Reserve factor', symbol: 'RF min', value: formatFactor(firstPlyFailure.reserveFactor), target: `≥ ${formatFactor(firstPlyFailure.targetReserveFactor)}` }}
      figures={[...failureLoad, ...moduli]}
      actions={actions}
    />
  )
}
