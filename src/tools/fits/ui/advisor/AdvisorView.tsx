// Advisor mode ("Fit Tolerance v2" design): inputs on the left, the candidate
// chart and the reasoning in the centre, the recommendation and the ranked
// candidates on the right.
import { useState, type Dispatch } from 'react'
import { Badge, Callout, Column, ColumnHeader, ModeSwitch, Rationale } from '../../../../app/ui'
import { unitOf, type UnitSystem } from '../../../../core/units'
import type { FitAdvice } from '../../advisor'
import { formatFit, parseFitDesignation } from '../../calc'
import { chartedCandidates } from '../logic/candidates'
import type { FitResults } from '../logic/fitResults'
import { serviceClearance } from '../logic/serviceClearance'
import { BandLegend } from '../shared/BandLegend'
import { FIT_MODES, nominalLabel } from '../shared/labels'
import sharedStyles from '../shared/shared.module.css'
import type { FitInputs } from '../state/fitInputs'
import type { FitAction } from '../state/fitReducer'
import { AdvisorInputs } from './AdvisorInputs'
import styles from './advisor.module.css'
import { CandidateChart } from './CandidateChart'
import { RankedCandidates } from './RankedCandidates'
import { CandidateSummary, RecommendationActions } from './Recommendation'

interface AdvisorViewProps {
  inputs: FitInputs
  results: FitResults
  system: UnitSystem
  dispatch: Dispatch<FitAction>
}

export function AdvisorView({ inputs, results, system, dispatch }: AdvisorViewProps) {
  const advice = results.advice
  return (
    <>
      <Column width="inputs" label="Inputs" header={<ModeSwitch modes={FIT_MODES} mode={inputs.mode} onChange={(mode) => dispatch({ type: 'change', changes: { mode } })} />}>
        <AdvisorInputs inputs={inputs} results={results} system={system} dispatch={dispatch} />
      </Column>
      {advice.ok ? (
        <AdvisorResults advice={advice.value} inputs={inputs} results={results} system={system} dispatch={dispatch} />
      ) : (
        <Column label="Fit candidates" divider={false} header={<ColumnHeader title="Fit candidates" />}>
          <div className={sharedStyles.problem}>
            <Callout status="bad" title="No advice for these inputs">
              {advice.error}
            </Callout>
          </div>
        </Column>
      )}
    </>
  )
}

interface AdvisorResultsProps extends AdvisorViewProps {
  advice: FitAdvice
}

function AdvisorResults({ advice, inputs, results, system, dispatch }: AdvisorResultsProps) {
  const [comparedDesignation, setComparedDesignation] = useState<string | null>(null)
  const [best, runnerUp] = advice.candidates
  const compared = advice.candidates.find((c) => c !== best && c.fit.designation === comparedDesignation) ?? null
  const charted = chartedCandidates(advice.candidates, compared?.fit.designation ?? null).map((candidate) => ({
    candidate,
    bands: serviceClearance(candidate.fit, inputs, results.housing, results.shaft).bands,
  }))
  const currentDesignation = formatFit({ hole: inputs.hole, shaft: inputs.shaft })
  const applyBest = () => {
    const fit = parseFitDesignation(best.fit.designation)
    if (fit.ok) dispatch({ type: 'applyFit', fit: fit.value })
  }
  const toggleCompare = () => setComparedDesignation(compared ? null : (runnerUp?.fit.designation ?? null))

  return (
    <>
      <Column
        label="Fit candidates"
        header={
          <ColumnHeader
            title="Fit candidates"
            meta={`${nominalLabel(inputs.nominalMm, system)} · clearance (+) / interference (−) · ${unitOf('deviation', system)}`}
            actions={<BandLegend bands={charted[0]?.bands ?? []} system={system} />}
          />
        }
      >
        <div className={styles.chartArea}>
          <CandidateChart
            charted={charted}
            inputs={inputs}
            system={system}
            bestDesignation={best.fit.designation}
            comparedDesignation={compared?.fit.designation ?? null}
            currentDesignation={currentDesignation}
          />
        </div>
        <Rationale>
          <span>{advice.why}</span>
          {advice.materialNotes.map((note) => (
            <span key={note} className={styles.notes}>
              {note}
            </span>
          ))}
        </Rationale>
      </Column>

      <Column
        width="results"
        divider={false}
        wrap
        label="Recommendation"
        header={
          <ColumnHeader
            title="Recommendation"
            actions={
              <Badge variant="reference" size="md">
                ISO 286-1 · 286-2
              </Badge>
            }
          />
        }
      >
        <CandidateSummary candidate={best} title="Best match" size="lg" system={system}>
          <RecommendationActions comparing={compared !== null} onApply={applyBest} onToggleCompare={toggleCompare} />
        </CandidateSummary>
        {compared && <CandidateSummary candidate={compared} title="Compared" size="sm" system={system} />}
        <RankedCandidates
          candidates={advice.candidates}
          system={system}
          comparedDesignation={compared?.fit.designation ?? null}
          currentDesignation={currentDesignation}
          onCompare={setComparedDesignation}
        />
      </Column>
    </>
  )
}
