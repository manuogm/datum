// Optimise layup: searches, on request and off the main thread, for the
// symmetric, balanced laminate of the top ply's material with the fewest
// plies that reaches the target under the loads on screen. The best
// sequence and its alternatives can each replace the layup being edited:
// every ply then takes the material searched, so a hybrid stack becomes one
// the optimiser analysed. The design rules the search applied are listed under
// the result.
import { useState } from 'react'
import { countOf } from '../../../../app/format/count'
import { Button, Chip, InputWell, MonoLabel, NumberInput, PanelSection, ValueRow } from '../../../../app/ui'
import { formatQuantity, type UnitSystem } from '../../../../core/units'
import type { LayupCandidate } from '../../optimise'
import { formatFactor, plyMaterialName } from '../logic/labels'
import { appliedRules, DEFAULT_OPTIMISER_SETTINGS, DIRECTION_CHOICES, directionLabel, optimiseRequest, type OptimiserSettings } from '../logic/optimiserRequest'
import type { LaminateInputs } from '../state/lamInputs'
import styles from './optimiser.module.css'
import { requestKey, useOptimiser, type OptimiserRun } from './useOptimiser'

interface OptimiserPanelProps {
  inputs: LaminateInputs
  system: UnitSystem
  /** The layup at these angles, every ply of this material. */
  onUse: (anglesDeg: readonly number[], materialId: string) => void
}

/** '8–10 plies', '8 plies' */
const plyCountsText = ([fewest, most]: readonly [number, number]) => (fewest === most ? countOf(fewest, 'ply', 'plies') : `${fewest}–${most} plies`)

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
  onUse: (anglesDeg: readonly number[], materialId: string) => void
}

function OptimiserResult({ run, current, system, onUse }: OptimiserResultProps) {
  const stale = !current && <p className={styles.warnNote}>The inputs have changed since this search: run it again.</p>
  if (!run.result.ok)
    return (
      <div className={styles.result}>
        {stale}
        <p className={styles.warnNote}>{run.result.error}</p>
      </div>
    )
  const { best, candidates, search, targetReserveFactor, rules } = run.result.value
  const material = run.input.material
  const use = (anglesDeg: readonly number[]) => onUse(anglesDeg, material.id)
  const others = candidates.filter((c) => c.notation !== best?.notation)
  const target = formatFactor(targetReserveFactor)
  const applied = appliedRules(rules, run.input.anglesDeg ?? [])
  return (
    <div className={styles.result}>
      {stale}
      {best ? (
        <CandidateCard candidate={best} system={system} disabled={!current} onUse={use} />
      ) : (
        <p className={styles.warnNote}>
          No laminate up to {search.maxPlies} plies reaches RF {target}.
        </p>
      )}
      {others.length > 0 && (
        <div className={styles.alternatives}>
          <MonoLabel>{best ? 'Alternatives' : `Closest · below RF ${target}`}</MonoLabel>
          <ul className={styles.candidates} aria-label={best ? 'Alternatives' : `Closest laminates, below RF ${target}`}>
            {others.map((candidate) => (
              <li key={candidate.notation} className={styles.candidate}>
                <span className={styles.candidateNotation}>{candidate.notation}</span>
                <span className={candidate.reserveFactor < targetReserveFactor ? styles.candidateRfBelow : styles.candidateRf}>RF {formatFactor(candidate.reserveFactor)}</span>
                <Button variant="link" size="sm" disabled={!current} onClick={() => use(candidate.anglesDeg)}>
                  Use
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className={styles.note}>
        {material.name} · {countOf(search.sequencesAnalysed, 'sequence', 'sequences')}, {plyCountsText(search.plyCounts)}, {run.seconds.toFixed(1)} s
        {search.exhaustive ? '' : ' · not exhaustive: best found'}
      </p>
      <details className={styles.rules}>
        <summary>Design rules applied ({applied.length})</summary>
        <ul>
          {applied.map((rule) => (
            <li key={rule.id}>{rule.description}</li>
          ))}
        </ul>
      </details>
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
