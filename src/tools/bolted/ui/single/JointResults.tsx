// Single joint, Results step, in three depths: the verdict with the
// governing check and the figures to put on the drawing (preload, torque,
// load factor); "Show details", the joint diagram and one row per check;
// "Show calculation", the whole trail R0 … R13 with the step behind the
// verdict open.
import type { ReactNode } from 'react'
import { LegendItem, Marker, ResultRow, ResultsLayout, VerdictCard } from '../../../../app/ui'
import { formatDecimal, formatQuantity, unitOf, type UnitSystem } from '../../../../core/units'
import type { BoltedJointAnalysis, StepId } from '../../calc'
import { STEP_MARKER } from '../logic/labels'
import { safetyFactorText } from '../logic/trailValues'
import { CALCULATION_STATUS, formatUtilisation, jointVerdict, verdictCheck } from '../logic/verdict'
import { CalculationTrail } from '../shared/CalculationTrail'
import { JointDiagram } from './JointDiagram'
import styles from './single.module.css'

interface JointResultsProps {
  analysis: BoltedJointAnalysis
  /** FA,max, drawn on the joint diagram. */
  axialN: number
  system: UnitSystem
  /** Inputs shown inside the trail's steps that ask for them (pG in R10). */
  stepInputs?: Partial<Record<StepId, ReactNode>>
  /** Remembers which depths are open: the step flow's key. */
  memoryKey?: string
}

export function JointResults({ analysis, axialN, system, stepInputs, memoryKey }: JointResultsProps) {
  const { summary, preload, steps } = analysis
  const { sentence, detail } = jointVerdict(analysis)
  const governing = steps.find((s) => s.id === summary.governing)
  // Every check, and a step that needs review without a number (R10 when pG is not known).
  const checks = steps.filter((s) => s.status !== 'info')
  return (
    <ResultsLayout
      memoryKey={memoryKey}
      verdict={
        <VerdictCard
          status={CALCULATION_STATUS[summary.status]}
          sentence={sentence}
          detail={detail}
          headline={{
            label: 'Utilisation',
            symbol: governing?.check ? `u · ${governing.rStep} ${safetyFactorText(governing.check)}` : 'u',
            value: formatUtilisation(summary.utilisation),
            target: '≤ 1.00',
          }}
          figures={[
            { label: 'Preload', symbol: 'FM,min', value: formatQuantity('force', system, preload.assemblyMinN), unit: unitOf('force', system) },
            { label: 'Torque', symbol: 'MA', value: formatQuantity('torque', system, preload.tighteningTorqueNm), unit: unitOf('torque', system) },
            { label: 'Load factor', symbol: 'Φn', value: formatDecimal(analysis.loadFactor, 2, true) },
          ]}
          reference="VDI 2230-1:2015"
        />
      }
      detailsSummary={`Joint diagram · ${checks.length} checks`}
      details={
        <div className={styles.details}>
          <figure className={styles.diagram}>
            <figcaption className={styles.caption}>Force – elongation at FV,min</figcaption>
            <JointDiagram analysis={analysis} axialN={axialN} system={system} />
            <div className={styles.legend}>
              <LegendItem swatch={<Marker shape="line" color="text" />}>Bolt</LegendItem>
              <LegendItem swatch={<Marker shape="line" color="hole" />}>Clamped parts</LegendItem>
              <LegendItem swatch={<Marker shape="line" color="accent" />}>FA</LegendItem>
              <LegendItem swatch={<Marker shape="line" color="ok" />}>FKR</LegendItem>
            </div>
          </figure>
          <div className={styles.checks}>
            {checks.map((step) => (
              <ResultRow
                key={step.id}
                label={`${step.rStep} · ${step.title}`}
                value={step.check ? safetyFactorText(step.check) : 'not checked'}
                marker={{ color: STEP_MARKER[step.status], shape: 'dot' }}
              />
            ))}
          </div>
        </div>
      }
      calculationSummary="R0 … R13 · values, equations and clauses"
      calculation={<CalculationTrail steps={steps} system={system} openStep={verdictCheck(analysis)?.id ?? null} stepInputs={stepInputs} />}
    />
  )
}
