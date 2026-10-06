// Step 4 · Results, in three depths the engineer opens on purpose:
//   1. the verdict: lowest reserve factor against the target, the critical
//      plies, the failure load and the moduli, with "Optimise layup";
//   2. details: the failure index of every ply, the exploded stack and a ply
//      value through the thickness (σx, σ1, … or the failure index);
//   3. calculation: couplings, the ABD matrix, every engineering constant
//      and the sources.
// "Optimise layup" opens the optimiser in a dialog; "Use this layup" applies
// it and closes the dialog, so the new verdict shows at once.
import { useState } from 'react'
import { Button, Dialog, MonoLabel, ProblemCallout, ResultsLayout, SegmentedControl, StepPage } from '../../../../app/ui'
import { formatDecimal } from '../../../../core/units'
import { DEFAULT_TSAI_WU_F12_STAR, type LaminateAnalysis } from '../../calc'
import { appliedLoadsText } from '../logic/loads'
import { FAULT_TITLE, stepLabel } from '../logic/steps'
import { CRITERION_LABELS, LAMINATE_STANDARDS, plyMaterialName } from '../logic/labels'
import { PLOT_COMPONENTS, type PlotComponent } from '../logic/thicknessPlot'
import { OptimiserPanel } from '../optimiser/OptimiserPanel'
import { LaminateDrawings } from '../plots/LaminateDrawings'
import { LaminateVerdict } from '../results/LaminateVerdict'
import { PlyFailureList } from '../results/PlyFailureList'
import resultStyles from '../results/results.module.css'
import { StiffnessSection } from '../results/StiffnessSection'
import type { LamStepProps } from './stepProps'
import styles from './steps.module.css'

export function ResultsStep(props: LamStepProps) {
  const { inputs, analysis, flow, fault } = props
  if (!analysis.ok) {
    return (
      <StepPage {...flow.page} title="Results" wide>
        <ResultsLayout
          verdict={
            <ProblemCallout title={FAULT_TITLE} back={{ label: stepLabel(fault?.step ?? 'layup'), onClick: () => flow.goTo(fault?.step ?? 'layup') }}>
              {analysis.error}
            </ProblemCallout>
          }
        />
      </StepPage>
    )
  }
  const materials = [...new Set(inputs.plies.map((p) => p.materialId))].map(plyMaterialName).join(', ')
  const loads = appliedLoadsText(inputs.loads, props.system) || 'no load'
  return (
    <StepPage {...flow.page} title="Results" hint={`${analysis.value.layup.notation} of ${materials} under ${loads}, checked for first-ply failure.`} wide>
      <Results {...props} result={analysis.value} />
    </StepPage>
  )
}

function Results({ inputs, dispatch, system, flow, selectedPly, onSelectPly, result }: LamStepProps & { result: LaminateAnalysis }) {
  const [component, setComponent] = useState<PlotComponent>('sx')
  const [optimising, setOptimising] = useState(false)
  return (
    <>
      <ResultsLayout
        memoryKey={flow.memoryKey}
        verdict={
          <LaminateVerdict
            analysis={result}
            system={system}
            actions={
              <Button variant="secondary" size="md" onClick={() => setOptimising(true)}>
                Optimise layup
              </Button>
            }
          />
        }
        detailsSummary="Failure index per ply · exploded ply stack · values through the thickness"
        details={
          <>
            <PlyFailureList analysis={result} selectedPly={selectedPly} onSelect={onSelectPly} />
            <div className={styles.drawings}>
              <LaminateDrawings
                analysis={result}
                component={component}
                system={system}
                selectedPly={selectedPly}
                onSelectPly={onSelectPly}
                componentSwitch={
                  <SegmentedControl label="Value through the thickness" size="sm" options={PLOT_COMPONENTS} value={component} onChange={setComponent} />
                }
              />
            </div>
          </>
        }
        calculationSummary="Couplings · ABD matrix · engineering constants · sources"
        calculation={
          <>
            <StiffnessSection analysis={result} system={system} />
            <section className={resultStyles.section} aria-label="Sources">
              <MonoLabel>Sources</MonoLabel>
              <p className={styles.sources}>
                Classical laminate theory, first-ply failure by {CRITERION_LABELS[result.criterion]}
                {result.criterion === 'tsai-wu' && ` (F12* ${formatDecimal(DEFAULT_TSAI_WU_F12_STAR, 1)})`}. {LAMINATE_STANDARDS}. Linear CLT: no residual,
                interlaminar or free-edge stresses.
              </p>
            </section>
          </>
        }
      />
      {optimising && (
        <Dialog title="Optimise layup" subtitle="Symmetric · balanced" onClose={() => setOptimising(false)}>
          <OptimiserPanel
            inputs={inputs}
            system={system}
            onUse={(anglesDeg, materialId) => {
              dispatch({ type: 'layup', anglesDeg, materialId })
              setOptimising(false)
            }}
          />
        </Dialog>
      )}
    </>
  )
}
