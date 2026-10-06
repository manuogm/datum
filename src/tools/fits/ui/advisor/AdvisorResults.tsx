// Advisor, results: the best match as the verdict, with "Apply to calculator"
// and "Compare runner-up"; on request the details (the candidate chart, the
// checks of the best and the compared fit, every candidate ranked) and the
// calculation (the advisor's reasoning in full, and its sources).
import { useState } from 'react'
import { Badge, Button, MonoLabel, ProblemCallout, Rationale, ResultsLayout, StepPage, VerdictCard } from '../../../../app/ui'
import { formatQuantityRange, unitOf, type UnitSystem } from '../../../../core/units'
import type { FitAdvice, FitCandidate } from '../../advisor'
import { formatFit, parseFitDesignation } from '../../calc'
import { assemblyTemperatures } from '../logic/assemblyTemperatures'
import { chartedCandidates } from '../logic/candidates'
import { serviceClearance } from '../logic/serviceClearance'
import { adviceVerdict, candidateStatus } from '../logic/verdict'
import { BandLegend } from '../shared/BandLegend'
import { FIT_TYPE_LABEL, nominalLabel } from '../shared/labels'
import type { FitStepProps } from '../shared/stepProps'
import styles from './advisor.module.css'
import { CandidateChart } from './CandidateChart'
import { RankedCandidates } from './RankedCandidates'
import { CandidateSummary } from './CandidateSummary'

const REFERENCE = 'ISO 286-1 · 286-2'

export function AdvisorResults(props: FitStepProps) {
  const { inputs, results, flow, fault } = props
  const advice = results.advice
  if (!advice.ok) {
    const step = fault?.step === 'size' ? { id: 'size', label: 'Size & materials' } : { id: 'requirements', label: 'Requirements' }
    return (
      <StepPage {...flow.page} title="Results" wide>
        <ResultsLayout
          verdict={
            <ProblemCallout title="No advice for these inputs" back={{ label: step.label, onClick: () => flow.goTo(step.id) }}>
              {advice.error}
            </ProblemCallout>
          }
        />
      </StepPage>
    )
  }
  return (
    <StepPage
      {...flow.page}
      title="Results"
      hint={`The ISO fits for ${nominalLabel(inputs.nominalMm, props.system)} in ${results.housing.name} and ${results.shaft.name}, ranked against the requirements.`}
      wide
    >
      <Recommendation {...props} advice={advice.value} />
    </StepPage>
  )
}

function Recommendation({ advice, inputs, results, system, dispatch, flow }: FitStepProps & { advice: FitAdvice }) {
  const [comparedDesignation, setComparedDesignation] = useState<string | null>(null)
  const [best, runnerUp] = advice.candidates
  const compared = advice.candidates.find((c) => c !== best && c.fit.designation === comparedDesignation) ?? null
  const charted = chartedCandidates(advice.candidates, compared?.fit.designation ?? null).map((candidate) => ({
    candidate,
    bands: serviceClearance(candidate.fit, inputs, results.housing, results.shaft).bands,
  }))
  const currentDesignation = formatFit({ hole: inputs.hole, shaft: inputs.shaft })
  // The best fit goes to the calculator, which opens on its results.
  const applyBest = () => {
    const fit = parseFitDesignation(best.fit.designation)
    if (!fit.ok) return
    dispatch({ type: 'applyFit', fit: fit.value })
    flow.reachAll('results')
  }
  const toggleCompare = () => setComparedDesignation(compared ? null : (runnerUp?.fit.designation ?? null))
  const { sentence, detail } = adviceVerdict(advice.why)

  return (
    <ResultsLayout
      memoryKey={flow.memoryKey}
      verdict={
        <VerdictCard
          status={candidateStatus(best)}
          sentence={sentence}
          detail={detail}
          reference={REFERENCE}
          headline={{ label: 'Best match', value: best.fit.designation }}
          figures={bestFigures(best, system)}
          actions={
            <>
              <Button variant="primary" size="md" onClick={applyBest}>
                Apply to calculator
              </Button>
              {runnerUp && (
                <Button size="md" aria-pressed={compared !== null} onClick={toggleCompare}>
                  {compared ? 'Stop comparing' : `Compare runner-up ${runnerUp.fit.designation}`}
                </Button>
              )}
            </>
          }
        />
      }
      detailsSummary={`${charted.length} fits charted · checks · all ${advice.candidates.length} candidates ranked`}
      details={
        <>
          <div className={styles.chartHead}>
            <MonoLabel>Fit candidates</MonoLabel>
            <span className={styles.chartMeta}>
              {nominalLabel(inputs.nominalMm, system)} · clearance (+) / interference (−) · {unitOf('deviation', system)}
            </span>
            <span className={styles.legend}>
              <BandLegend bands={charted[0]?.bands ?? []} system={system} />
            </span>
          </div>
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
          <div className={styles.summaries}>
            <CandidateSummary candidate={best} title="Best match" system={system} />
            {compared && <CandidateSummary candidate={compared} title="Compared" system={system} />}
          </div>
          <RankedCandidates
            candidates={advice.candidates}
            system={system}
            comparedDesignation={compared?.fit.designation ?? null}
            currentDesignation={currentDesignation}
            onCompare={setComparedDesignation}
          />
        </>
      }
      calculationSummary={`Why ${best.fit.designation} · material notes · ${REFERENCE}`}
      calculation={
        <>
          <Rationale>
            <span>{advice.why}</span>
            {advice.materialNotes.map((note) => (
              <span key={note} className={styles.notes}>
                {note}
              </span>
            ))}
          </Rationale>
          <div className={styles.sources}>
            <Badge variant="reference" size="sm">
              ISO 286-1, fits and tolerances
            </Badge>
            <Badge variant="reference" size="sm">
              ISO 286-2, limit deviations
            </Badge>
          </div>
        </>
      }
    />
  )
}

/** The best match's key figures: clearance in service, score, fit type and, for a thermal assembly, the temperature to heat or cool to. */
function bestFigures(best: FitCandidate, system: UnitSystem) {
  const assembly = assemblyTemperatures(best.thermalAssembly, system)[0]
  return [
    {
      label: 'In service',
      value: formatQuantityRange('deviation', system, best.inServiceUm.minUm, best.inServiceUm.maxUm, false),
      unit: unitOf('deviation', system),
    },
    { label: 'Score', value: best.score, unit: '/ 100' },
    { label: 'Fit type', value: FIT_TYPE_LABEL[best.fit.fitType] },
    ...(assembly ? [{ label: assembly.label, value: assembly.value }] : []),
  ]
}
