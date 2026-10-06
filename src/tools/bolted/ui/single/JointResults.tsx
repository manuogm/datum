// Single joint, right column: the verdict with the governing check, the
// minimum assembly preload and tightening torque to put on the drawing, then
// the whole calculation trail R0 … R13.
import type { ReactNode } from 'react'
import { Callout, Readout } from '../../../../app/ui'
import { formatQuantity, unitOf, type UnitSystem } from '../../../../core/units'
import type { BoltedJointAnalysis, StepId } from '../../calc'
import { CHECK_ICON } from '../logic/labels'
import { jointHeadline } from '../logic/verdict'
import { CalculationTrail } from '../shared/CalculationTrail'
import styles from './single.module.css'

interface JointResultsProps {
  analysis: BoltedJointAnalysis
  system: UnitSystem
  /** Inputs shown inside the trail's steps that ask for them. */
  stepInputs?: Partial<Record<StepId, ReactNode>>
}

export function JointResults({ analysis, system, stepInputs }: JointResultsProps) {
  const { summary, preload, steps } = analysis
  const headline = jointHeadline(analysis)
  return (
    <>
      <section className={styles.summary} aria-label="Summary">
        <Callout status={CHECK_ICON[summary.status]} title={headline.title}>
          {headline.detail}
        </Callout>
        <div className={styles.readouts}>
          <Readout label="Preload FM,min" value={formatQuantity('force', system, preload.assemblyMinN)} unit={unitOf('force', system)} size="sm" />
          <Readout label="Torque MA" value={formatQuantity('torque', system, preload.tighteningTorqueNm)} unit={unitOf('torque', system)} size="sm" />
        </div>
      </section>
      <CalculationTrail steps={steps} system={system} openStep={summary.governing} stepInputs={stepInputs} />
    </>
  )
}
