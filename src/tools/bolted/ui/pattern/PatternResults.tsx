// Bolt pattern, right column: the governing bolt of the load case on screen,
// the highest utilisation, each joint type's most utilised bolt, the load
// and utilisation of every bolt, and the calculation trail of the bolt chosen
// in the plan or the table.
import { Callout, cx, Marker, MonoLabel, Readout, ScoreBar } from '../../../../app/ui'
import { formatDecimal, formatQuantity, unitOf, type UnitSystem } from '../../../../core/units'
import type { BoltPatternAnalysis, PatternBoltResult } from '../../pattern'
import { boltHeadline, formatUtilisation, utilisationTone } from '../logic/verdict'
import { CalculationTrail } from '../shared/CalculationTrail'
import type { LoadCaseSpec } from '../state/boltInputs'
import styles from './pattern.module.css'

const ratio = (value: number) => formatDecimal(value, 2, true)
/** Bars run to u = 1.5, so a failing bolt still reads as longer than a passing one. */
const BAR_FULL_SCALE = 1.5

interface PatternResultsProps {
  analysis: BoltPatternAnalysis
  loadCase: LoadCaseSpec
  system: UnitSystem
  selectedBolt: string
  onSelectBolt: (id: string) => void
}

export function PatternResults({ analysis, loadCase, system, selectedBolt, onSelectBolt }: PatternResultsProps) {
  const { governing } = analysis
  const headline = boltHeadline(governing, loadCase.id)
  const tone = (bolt: PatternBoltResult) => utilisationTone(bolt.utilisation, bolt.status)
  const selected = analysis.bolts.find((b) => b.bolt.id === selectedBolt) ?? governing
  const forceUnit = unitOf('force', system)
  return (
    <>
      <section className={styles.summary} aria-label="Summary">
        <Callout status={headline.tone} title={headline.title}>
          {headline.detail}
        </Callout>
        <div className={styles.readouts}>
          <Readout label="Max utilisation" value={formatUtilisation(governing.utilisation)} />
          <Readout label="Min margin 1/u" value={ratio(1 / governing.utilisation)} size="sm" />
        </div>
      </section>

      <section className={styles.summary} aria-label="By joint type">
        <MonoLabel>By joint type · u max</MonoLabel>
        <div className={styles.byType}>
          {analysis.byJointType.map((t) => (
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
          {analysis.bolts.map((b) => (
            <tr key={b.bolt.id} className={cx(b.bolt.id === selected.bolt.id && styles.selectedRow)} onClick={() => onSelectBolt(b.bolt.id)}>
              <td>
                <button type="button" className={styles.boltLink} onClick={() => onSelectBolt(b.bolt.id)} aria-pressed={b.bolt.id === selected.bolt.id}>
                  {b.bolt.id}
                </button>
              </td>
              <td className={styles.byTypeId}>{b.bolt.jointTypeId}</td>
              <td>{formatQuantity('force', system, b.load.axialN)}</td>
              <td>{formatQuantity('force', system, b.load.shearN)}</td>
              <td>
                <span className={styles.utilisation}>
                  <ScoreBar value={Math.min(100, (100 * b.utilisation) / BAR_FULL_SCALE)} tone={tone(b)} width="compact" label={`${b.bolt.id} utilisation`} />
                  {formatUtilisation(b.utilisation)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.trailHead}>
        <MonoLabel>
          {selected.bolt.id} · {selected.bolt.jointTypeId} · calculation trail in {loadCase.id}
        </MonoLabel>
      </div>
      <CalculationTrail key={selected.bolt.id} steps={selected.analysis.steps} system={system} openStep={selected.analysis.summary.governing} />
    </>
  )
}
