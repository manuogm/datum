// Results column: the first-ply failure verdict against the target, the
// reserve factor and the failure load, the laminate's in-plane constants,
// the failure index of every ply, then the laminate stiffness.
import { Callout, MonoLabel, Readout } from '../../../../app/ui'
import { formatQuantity, unitOf, type UnitSystem } from '../../../../core/units'
import type { LaminateAnalysis } from '../../calc'
import { formatFactor } from '../logic/labels'
import { failureLoadNote, leadingLoad } from '../logic/loads'
import { constantViews } from '../logic/stiffness'
import { laminateHeadline } from '../logic/verdict'
import { PlyFailureList } from './PlyFailureList'
import styles from './results.module.css'
import { StiffnessSection } from './StiffnessSection'

interface LaminateResultsProps {
  analysis: LaminateAnalysis
  system: UnitSystem
  selectedPly: number | null
  onSelectPly: (index: number) => void
}

/** Ex, Ey, Gxy, νxy: the four the summary shows. */
const SUMMARY_CONSTANTS = 4

export function LaminateResults({ analysis, system, selectedPly, onSelectPly }: LaminateResultsProps) {
  const { firstPlyFailure } = analysis
  const headline = laminateHeadline(analysis)
  const load = leadingLoad(firstPlyFailure.loads)
  const loadNote = failureLoadNote(firstPlyFailure.loads, system)
  return (
    <>
      <section className={styles.summary} aria-label="Summary">
        <Callout status={headline.tone} title={headline.title}>
          {headline.detail}
        </Callout>
        <div className={styles.readouts}>
          <Readout label="RF min" value={formatFactor(firstPlyFailure.reserveFactor)} />
          {load && (
            <Readout
              label={`FPF load ${load.symbol}`}
              value={formatQuantity(load.quantity, system, firstPlyFailure.loads[load.key])}
              unit={unitOf(load.quantity, system)}
              size="sm"
            />
          )}
        </div>
        {loadNote && <p className={styles.loadNote}>{loadNote}</p>}
        {analysis.constants.apparent && (
          <MonoLabel tone="faint" as="div">
            apparent constants: B ≠ 0
          </MonoLabel>
        )}
        <dl className={styles.constants}>
          {constantViews(analysis.constants, system)
            .slice(0, SUMMARY_CONSTANTS)
            .map((c) => (
              <div key={c.symbol}>
                <dt className={styles.constantSymbol}>{c.symbol}</dt>
                <dd className={styles.constantValue}>{c.value}</dd>
                <dd className={styles.constantUnit}>{c.unit || '–'}</dd>
              </div>
            ))}
        </dl>
      </section>
      <PlyFailureList analysis={analysis} selectedPly={selectedPly} onSelect={onSelectPly} />
      <StiffnessSection analysis={analysis} system={system} />
    </>
  )
}
