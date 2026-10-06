// The failure index of every ply, top ply first (the head counts the plies
// that fail or miss the target): FI = 1/RF grows in
// proportion to the load and reaches 1 at first-ply failure. Bars are
// coloured by the ply's reserve factor against the target; a row picks the
// ply shown in the plots and the ply list.
import { cx, MonoLabel, ScoreBar } from '../../../../app/ui'
import type { LaminateAnalysis } from '../../calc'
import { angleText, formatFactor, modeText } from '../logic/labels'
import { plyTally, plyTones } from '../logic/verdict'
import styles from './results.module.css'

interface PlyFailureListProps {
  analysis: Pick<LaminateAnalysis, 'plies' | 'firstPlyFailure' | 'criterion'>
  selectedPly: number | null
  onSelect: (index: number) => void
}

export function PlyFailureList({ analysis, selectedPly, onSelect }: PlyFailureListProps) {
  const tones = plyTones(analysis)
  const tally = plyTally(tones, Number.isFinite(analysis.firstPlyFailure.reserveFactor))
  return (
    <section className={styles.section} aria-label="Failure index per ply">
      <div className={styles.sectionHead}>
        <MonoLabel>Failure index per ply</MonoLabel>
        <MonoLabel>
          <span className={styles[tally.tone]}>{tally.text}</span>
        </MonoLabel>
      </div>
      <ol className={styles.plies}>
        {analysis.plies.map((ply, i) => {
          const tone = tones[i]
          return (
            <li key={ply.index}>
              <button
                type="button"
                className={cx(styles.plyRow, ply.index === selectedPly && styles.plyRowSelected)}
                aria-pressed={ply.index === selectedPly}
                title={`Ply ${ply.index}: RF ${formatFactor(ply.reserveFactor)}, ${modeText(analysis.criterion, ply.mode)}`}
                onClick={() => onSelect(ply.index)}
              >
                <span className={styles.plyIndex}>{ply.index}</span>
                <span>{angleText(ply.angleDeg)}°</span>
                <ScoreBar value={Math.min(100, ply.failureIndex * 100)} tone={tone} label={`Ply ${ply.index} failure index`} />
                <span className={cx(styles.plyFi, styles[tone])}>{formatFactor(ply.failureIndex)}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
