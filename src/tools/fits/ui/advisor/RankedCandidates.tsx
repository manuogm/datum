// Advisor mode, right column, bottom: every candidate ranked by score, with
// its clearance range in service. Choosing a row compares it with the best.
import { cx, PanelSection, ScoreBar } from '../../../../app/ui'
import { formatQuantityRange, type UnitSystem } from '../../../../core/units'
import type { FitCandidate } from '../../advisor'
import { scoreTone } from '../logic/candidates'
import styles from './advisor.module.css'

interface RankedCandidatesProps {
  candidates: readonly FitCandidate[]
  system: UnitSystem
  comparedDesignation: string | null
  currentDesignation: string
  onCompare: (designation: string) => void
}

export function RankedCandidates({ candidates, system, comparedDesignation, currentDesignation, onCompare }: RankedCandidatesProps) {
  return (
    <PanelSection label="All candidates · clearance in service" grow>
      <ol className={styles.ranked}>
        {candidates.map((candidate, index) => {
          const { designation } = candidate.fit
          const tone = scoreTone(candidate.score)
          const range = formatQuantityRange('deviation', system, candidate.inServiceUm.minUm, candidate.inServiceUm.maxUm)
          return (
            <li key={designation}>
              <button
                type="button"
                className={cx(styles.rankRow, designation === comparedDesignation && styles.rankCompared)}
                aria-pressed={designation === comparedDesignation}
                disabled={index === 0}
                onClick={() => onCompare(designation)}
              >
                <span className={styles.rank}>{index + 1}</span>
                <span className={styles.rankName}>{designation}</span>
                <span className={styles.rankDetail}>
                  <span className={styles.rankRange}>
                    {range}
                    {designation === currentDesignation && ' · current'}
                  </span>
                  <ScoreBar value={candidate.score} tone={tone} label={`${designation} score`} />
                </span>
                <span className={cx(styles.rankScore, styles[tone])}>{candidate.score}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </PanelSection>
  )
}
