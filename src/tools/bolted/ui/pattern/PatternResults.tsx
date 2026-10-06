// Bolt pattern, Results step, for the load case chosen in the tabs above the
// verdict (each tab shows its case's highest utilisation, so the worst case
// stands out). Three depths: the verdict on the case's most utilised bolt;
// "Show details", the plan with every bolt ringed in its verdict colour, each
// joint type's most utilised bolt and the per-bolt table; "Show
// calculation", the trail of the bolt chosen in the plan or the table.
import { useState } from 'react'
import { cx, LegendItem, Marker, MonoLabel, ProblemCallout, ResultsLayout, ScoreBar, VerdictCard } from '../../../../app/ui'
import { formatDecimal, formatQuantity, unitOf, type UnitSystem } from '../../../../core/units'
import type { BoltResults } from '../logic/boltResults'
import { stepLabel, type StepFault } from '../logic/steps'
import { formatUtilisation, governingCase, loadCaseVerdict, REVIEW_UTILISATION, utilisationTone } from '../logic/verdict'
import { CalculationTrail } from '../shared/CalculationTrail'
import steps from '../shared/steps.module.css'
import type { PatternSpec } from '../state/boltInputs'
import { LoadCaseTabs } from './LoadCaseTabs'
import styles from './pattern.module.css'
import { PatternPlan } from './PatternPlan'

const ratio = (value: number) => formatDecimal(value, 2, true)
/** Bars run to u = 1.5, so a failing bolt still reads as longer than a passing one. */
const BAR_FULL_SCALE = 1.5

interface PatternResultsProps {
  pattern: PatternSpec
  results: BoltResults
  /** The input problem, if a load case cannot be analysed. */
  fault: StepFault | null
  system: UnitSystem
  onSelectLoadCase: (id: string) => void
  /** Go back to the step at fault. */
  onFix: (stepId: string) => void
  /** Remembers which depths are open: the step flow's key. */
  memoryKey?: string
}

export function PatternResults({ pattern, results, fault, system, onSelectLoadCase, onFix, memoryKey }: PatternResultsProps) {
  const [chosenBolt, setChosenBolt] = useState<string | null>(null)
  const { loadCase, analysis } = results.loadCases.find((c) => c.loadCase.id === pattern.loadCaseId) ?? results.loadCases[0]
  const tabs = <LoadCaseTabs loadCases={results.loadCases} selected={loadCase.id} onSelect={onSelectLoadCase} />

  if (!analysis.ok) {
    return (
      <ResultsLayout
        verdict={
          <div className={steps.verdict}>
            {tabs}
            <ProblemCallout
              title={`${loadCase.id} ${loadCase.name} cannot be analysed`}
              back={fault ? { label: stepLabel('pattern', fault.step), onClick: () => onFix(fault.step) } : undefined}
            >
              {analysis.error}
            </ProblemCallout>
          </div>
        }
      />
    )
  }

  const { governing, bolts, byJointType } = analysis.value
  const verdict = loadCaseVerdict(analysis.value, loadCase)
  const worst = governingCase(results.loadCases)
  // The bolt chosen in the plan or table, else the governing bolt of the load case.
  const selected = bolts.find((b) => b.bolt.id === chosenBolt) ?? governing
  const forceUnit = unitOf('force', system)
  return (
    <ResultsLayout
      memoryKey={memoryKey}
      verdict={
        <div className={steps.verdict}>
          {tabs}
          <VerdictCard
            status={verdict.status}
            sentence={verdict.sentence}
            detail={verdict.detail}
            headline={{ label: 'Max utilisation', symbol: 'u', value: formatUtilisation(governing.utilisation), target: '≤ 1.00' }}
            figures={[
              { label: 'Governing bolt', value: `${governing.bolt.id} · ${governing.bolt.jointTypeId}` },
              { label: 'Min margin', symbol: '1/u', value: ratio(1 / governing.utilisation) },
              { label: 'Worst load case', value: worst.ok ? `${worst.value.loadCase.id} ${worst.value.loadCase.name}` : '—' },
            ]}
            reference="VDI 2230-1 · rigid plate"
          />
        </div>
      }
      detailsSummary={`Plan · by joint type · ${bolts.length} bolts in ${loadCase.id}`}
      details={
        <div className={styles.details}>
          <div className={styles.planColumn}>
            <div className={styles.plan}>
              <PatternPlan pattern={pattern} loadCase={loadCase} analysis={analysis} system={system} selectedBolt={selected.bolt.id} onSelectBolt={setChosenBolt} />
            </div>
            <div className={styles.legend}>
              <LegendItem swatch={<Marker shape="dot" color="ok" />}>passes</LegendItem>
              <LegendItem swatch={<Marker shape="dot" color="warn" />}>u ≥ {REVIEW_UTILISATION} or marginal</LegendItem>
              <LegendItem swatch={<Marker shape="dot" color="bad" />}>fails</LegendItem>
              <LegendItem swatch={<Marker shape="dot" color="hole" />}>shear on the bolt</LegendItem>
            </div>
          </div>

          <div className={styles.tableColumn}>
            <section className={styles.summary} aria-label="By joint type">
              <MonoLabel>By joint type · u max</MonoLabel>
              <div className={styles.byType}>
                {byJointType.map((t) => (
                  <div key={t.jointTypeId} className={styles.entry}>
                    <Marker shape="dot" color={utilisationTone(t.utilisation, t.status)} size={6} />
                    <span className={styles.byTypeId}>{t.jointTypeId}</span>
                    <span>{t.name}</span>
                    <span className={styles.number}>{formatUtilisation(t.utilisation)}</span>
                  </div>
                ))}
              </div>
            </section>

            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Bolt</th>
                  <th scope="col">J</th>
                  <th scope="col">FA {forceUnit}</th>
                  <th scope="col">FQ {forceUnit}</th>
                  <th scope="col">u</th>
                </tr>
              </thead>
              <tbody>
                {bolts.map((b) => (
                  <tr key={b.bolt.id} className={cx(b.bolt.id === selected.bolt.id && styles.selectedRow)} onClick={() => setChosenBolt(b.bolt.id)}>
                    <td>
                      <button type="button" className={styles.boltLink} onClick={() => setChosenBolt(b.bolt.id)} aria-pressed={b.bolt.id === selected.bolt.id}>
                        {b.bolt.id}
                      </button>
                    </td>
                    <td className={styles.byTypeId}>{b.bolt.jointTypeId}</td>
                    <td>{formatQuantity('force', system, b.load.axialN)}</td>
                    <td>{formatQuantity('force', system, b.load.shearN)}</td>
                    <td>
                      <span className={styles.utilisation}>
                        <ScoreBar
                          value={Math.min(100, (100 * b.utilisation) / BAR_FULL_SCALE)}
                          tone={utilisationTone(b.utilisation, b.status)}
                          width="compact"
                          label={`${b.bolt.id} utilisation`}
                        />
                        {formatUtilisation(b.utilisation)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={styles.tableNote}>Choose a bolt in the plan or the table to see its calculation.</p>
          </div>
        </div>
      }
      calculationSummary={`${selected.bolt.id} · ${selected.bolt.jointTypeId} in ${loadCase.id} · R0 … R13`}
      calculation={
        <>
          <div className={styles.trailHead}>
            <MonoLabel>
              {selected.bolt.id} · {selected.bolt.jointTypeId} · calculation trail in {loadCase.id}
            </MonoLabel>
          </div>
          <CalculationTrail key={selected.bolt.id} steps={selected.analysis.steps} system={system} openStep={selected.analysis.summary.governing} />
        </>
      }
    />
  )
}
