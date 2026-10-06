// Centre column: the exploded ply stack beside the chosen ply value through
// the thickness, with the colour key of the reserve factors under it.
import { LegendItem, Marker } from '../../../../app/ui'
import type { UnitSystem } from '../../../../core/units'
import type { LaminateAnalysis } from '../../calc'
import { formatFactor } from '../logic/labels'
import { PLOT_COMPONENTS, type PlotComponent } from '../logic/thicknessPlot'
import styles from './drawings.module.css'
import { StackPlot } from './StackPlot'
import { ThicknessPlot } from './ThicknessPlot'

interface LaminateDrawingsProps {
  analysis: LaminateAnalysis
  component: PlotComponent
  system: UnitSystem
  selectedPly: number | null
  onSelectPly: (index: number) => void
}

export function LaminateDrawings({ analysis, component, system, selectedPly, onSelectPly }: LaminateDrawingsProps) {
  const target = formatFactor(analysis.firstPlyFailure.targetReserveFactor)
  const label = PLOT_COMPONENTS.find((c) => c.value === component)?.label
  return (
    <div className={styles.drawings}>
      <figure className={styles.drawing}>
        <figcaption className={styles.title}>Exploded ply stack</figcaption>
        <div className={styles.plot}>
          <StackPlot
            anglesDeg={analysis.plies.map((p) => p.angleDeg)}
            criticalPlies={analysis.firstPlyFailure.criticalPlies}
            selectedPly={selectedPly}
            onSelect={onSelectPly}
          />
        </div>
      </figure>
      <figure className={styles.drawing}>
        <figcaption className={styles.title}>{component === 'fi' ? 'Failure index' : label} through the thickness</figcaption>
        <div className={styles.plot}>
          <ThicknessPlot analysis={analysis} component={component} system={system} selectedPly={selectedPly} />
        </div>
        <div className={styles.legend}>
          <LegendItem swatch={<Marker shape="square" color="ok" />}>RF ≥ {target}</LegendItem>
          <LegendItem swatch={<Marker shape="square" color="warn" />}>1 ≤ RF &lt; {target}</LegendItem>
          <LegendItem swatch={<Marker shape="square" color="bad" />}>RF &lt; 1</LegendItem>
        </div>
      </figure>
    </div>
  )
}
