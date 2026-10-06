// The VDI 2230 calculation trail, R0 … R13: one row per step with its check
// status and safety factor (or its main value), opening to the engine's
// message, any inputs the step asks for, every intermediate value and the
// clause it comes from.
import type { ReactNode } from 'react'
import { Badge, ResultRow, type MarkerColor } from '../../../../app/ui'
import { formatDecimal, type UnitSystem } from '../../../../core/units'
import type { CalculationStep, StepId, StepStatus } from '../../calc'
import { shownValue, stepHeadline } from '../logic/trailValues'
import { formatUtilisation } from '../logic/verdict'
import styles from './trail.module.css'

const STATUS_MARKER: Record<StepStatus, MarkerColor> = { pass: 'ok', warn: 'warn', fail: 'bad', info: 'faint' }

interface CalculationTrailProps {
  steps: readonly CalculationStep[]
  system: UnitSystem
  /** Opened at first: the governing check. */
  openStep?: StepId | null
  /** Inputs shown inside a step, under its message (e.g. pG in R10). */
  stepInputs?: Partial<Record<StepId, ReactNode>>
}

export function CalculationTrail({ steps, system, openStep = null, stepInputs = {} }: CalculationTrailProps) {
  return (
    <>
      {steps.map((step) => (
        <StepRow key={step.id} step={step} system={system} defaultOpen={step.id === openStep} inputs={stepInputs[step.id]} />
      ))}
    </>
  )
}

interface StepRowProps {
  step: CalculationStep
  system: UnitSystem
  defaultOpen: boolean
  inputs: ReactNode
}

function StepRow({ step, system, defaultOpen, inputs }: StepRowProps) {
  // A check shows its safety factor; a step that only calculates shows its result, the last value.
  const headline = stepHeadline(step, system)
  return (
    <ResultRow
      label={`${step.rStep} · ${step.title}`}
      value={step.check ? `SF ${headline.value}` : headline.value}
      unit={headline.unit}
      marker={{ color: STATUS_MARKER[step.status], shape: 'dot' }}
      defaultOpen={defaultOpen}
    >
      <p className={styles.message}>{step.message}</p>
      {inputs}
      <dl className={styles.values}>
        {step.values.map((v) => {
          const shown = shownValue(v, system)
          return (
            <div key={v.symbol + v.label} className={styles.entry}>
              <dt className={styles.symbol}>{v.symbol}</dt>
              <dd className={styles.label}>{v.label}</dd>
              <dd className={styles.value}>
                {shown.value}
                {shown.unit && <span className={styles.unit}>{shown.unit}</span>}
              </dd>
            </div>
          )
        })}
      </dl>
      {step.check && (
        <span className={styles.required}>
          required SF ≥ {formatDecimal(step.check.requiredSafetyFactor, 2, true)} · utilisation {formatUtilisation(step.check.utilisation)}
        </span>
      )}
      <div>
        <Badge variant="reference" size="sm">
          {step.clause}
        </Badge>
      </div>
    </ResultRow>
  )
}
