// Optimise layup: searches, on request and off the main thread, for the
// symmetric, balanced laminate of the top ply's material with the fewest
// plies that reaches the target under the loads on screen. The best
// sequence and its alternatives can each replace the layup being edited.
import { useState } from 'react'
import { Button, Chip, InputWell, NumberInput, PanelSection, ValueRow } from '../../../../app/ui'
import { formatQuantity, type UnitSystem } from '../../../../core/units'
import type { LayupCandidate } from '../../optimise'
import { formatFactor, plyMaterialName } from '../logic/labels'
import { DEFAULT_OPTIMISER_SETTINGS, DIRECTION_CHOICES, directionLabel, optimiseRequest, type OptimiserSettings } from '../logic/optimiserRequest'
import type { LaminateInputs } from '../state/lamInputs'
import styles from './optimiser.module.css'
import { requestKey, useOptimiser, type OptimiserRun } from './useOptimiser'

interface OptimiserPanelProps {
  inputs: LaminateInputs
  system: UnitSystem
  onUse: (anglesDeg: readonly number[]) => void
}

/** An even ply count of at least 2 (the optimiser only builds symmetric laminates). */
const evenPlies = (value: number) => Math.max(2, 2 * Math.round(value / 2))

export function OptimiserPanel({ inputs, system, onUse }: OptimiserPanelProps) {
  const [settings, setSettings] = useState<OptimiserSettings>(DEFAULT_OPTIMISER_SETTINGS)
  const { run, start, cancel } = useOptimiser()
  const request = optimiseRequest(inputs, settings)
  const current = request.ok && run.status !== 'idle' && run.request === requestKey(request.value)
  const toggle = (direction: number) => {
    const directions = settings.directions.includes(direction) ? settings.directions.filter((d) => d !== direction) : [...settings.directions, direction]
    setSettings({ ...settings, directions })
  }
  return (
    <PanelSection label="Optimise layup" aside="symmetric · balanced">
      <p className={styles.note}>
        Fewest plies of {plyMaterialName(inputs.plies[0].materialId)} that reach RF {formatFactor(inputs.targetReserveFactor)} under these loads.
      </p>
      <div className={styles.directions} role="group" aria-label="Ply directions allowed">
        {DIRECTION_CHOICES.map((direction) => (
          <Chip key={direction} variant="check" mono selected={settings.directions.includes(direction)} onClick={() => toggle(direction)}>
            {directionLabel(direction)}
          </Chip>
        ))}
      </div>
      <ValueRow
        label="Largest laminate"
        value={
          <InputWell unit="plies">
            <NumberInput label="Largest laminate, plies" decimals={0} value={settings.maxPlies} onChange={(value) => setSettings({ ...settings, maxPlies: evenPlies(value) })} />
          </InputWell>
        }
      />
      {run.status === 'running' ? (
        <div className={styles.running} role="status">
          <span className={styles.progress} aria-hidden="true" />
          <span className={styles.runningText}>Searching… {run.seconds.toFixed(1)} s</span>
          <Button variant="secondary" size="sm" onClick={cancel}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button variant="secondary" disabled={!request.ok} onClick={() => request.ok && start(request.value)}>
          Find layup
        </Button>
      )}
      {!request.ok && <p className={styles.warnNote}>{request.error}</p>}
      {run.status === 'done' && <OptimiserResult run={run} current={current} system={system} onUse={onUse} />}
    </PanelSection>
  )
}

interface OptimiserResultProps {
  run: Extract<OptimiserRun, { status: 'done' }>
  /** The result answers the inputs on screen. */
  current: boolean
  system: UnitSystem
  onUse: (anglesDeg: readonly number[]) => void
}

function OptimiserResult({ run, current, system, onUse }: OptimiserResultProps) {
  if (!run.result.ok) return <p className={styles.warnNote}>{run.result.error}</p>
  const { best, candidates, search, targetReserveFactor } = run.result.value
  const others = candidates.filter((c) => c.notation !== best?.notation)
  return (
    <div className={styles.result}>
      {!current && <p className={styles.warnNote}>The inputs have changed since this search: run it again.</p>}
      {best ? (
        <CandidateCard candidate={best} system={system} disabled={!current} onUse={onUse} />
      ) : (
        <p className={styles.warnNote}>
          No laminate up to {search.plyCounts[1]} plies reaches RF {formatFactor(targetReserveFactor)}.
        </p>
      )}
      {others.length > 0 && (
        <ul className={styles.candidates} aria-label="Alternatives">
          {others.map((candidate) => (
            <li key={candidate.notation} className={styles.candidate}>
              <span className={styles.candidateNotation}>{candidate.notation}</span>
              <span className={styles.candidateRf}>RF {formatFactor(candidate.reserveFactor)}</span>
              <Button variant="link" size="sm" disabled={!current} onClick={() => onUse(candidate.anglesDeg)}>
                Use
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p className={styles.note}>
        {search.sequencesAnalysed} sequences, {search.plyCounts[0]}–{search.plyCounts[1]} plies, {run.seconds.toFixed(1)} s
        {search.exhaustive ? '' : ' · not exhaustive: best found'}
      </p>
    </div>
  )
}

interface CandidateCardProps {
  candidate: LayupCandidate
  system: UnitSystem
  disabled: boolean
  onUse: (anglesDeg: readonly number[]) => void
}

function CandidateCard({ candidate, system, disabled, onUse }: CandidateCardProps) {
  return (
    <div className={styles.best}>
      <span className={styles.bestNotation}>{candidate.notation}</span>
      <span className={styles.bestFacts}>
        {candidate.plyCount} plies · RF {formatFactor(candidate.reserveFactor)} · h {formatQuantity('length', system, candidate.thicknessMm, { withUnit: true })} ·{' '}
        {formatQuantity('arealMass', system, candidate.arealMassKgPerM2, { withUnit: true })}
      </span>
      <Button variant="primary" size="sm" disabled={disabled} onClick={() => onUse(candidate.anglesDeg)}>
        Use this layup
      </Button>
    </div>
  )
}
