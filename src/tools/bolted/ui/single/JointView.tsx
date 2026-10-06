// Single joint mode, in the pit wall layout of the Bolt Pattern design: the
// joint's inputs on the left, section A–A and the joint diagram in the
// centre, the verdict and the calculation trail on the right.
import type { Dispatch } from 'react'
import { Badge, Callout, Column, ColumnHeader, LegendItem, Marker, ModeSwitch } from '../../../../app/ui'
import { formatDecimal, formatQuantity, unitOf, type UnitSystem } from '../../../../core/units'
import type { BoltedJointAnalysis } from '../../calc'
import type { BoltResults } from '../logic/boltResults'
import { BOLT_MODES, jointTitle, materialName } from '../logic/labels'
import { DesignInputs } from '../shared/DesignInputs'
import type { BoltInputs, JointDesignSpec } from '../state/boltInputs'
import type { BoltAction } from '../state/boltReducer'
import { JointDiagram } from './JointDiagram'
import { JointResults } from './JointResults'
import { LoadsFields } from './LoadsFields'
import { PressureInputs } from './PressureInputs'
import { SectionDiagram } from './SectionDiagram'
import styles from './single.module.css'

interface JointViewProps {
  inputs: BoltInputs
  results: BoltResults
  system: UnitSystem
  dispatch: Dispatch<BoltAction>
}

export function JointView({ inputs, results, system, dispatch }: JointViewProps) {
  const { design, loads } = inputs.joint
  const analysis = results.joint.ok ? results.joint.value : null
  const changeDesign = (changes: Partial<JointDesignSpec>) => dispatch({ type: 'design', target: { scope: 'joint' }, changes })
  return (
    <>
      <Column width="inputs" label="Inputs" header={<ModeSwitch modes={BOLT_MODES} mode={inputs.mode} onChange={(mode) => dispatch({ type: 'change', changes: { mode } })} />}>
        <DesignInputs
          design={design}
          system={system}
          clampLengthMm={analysis?.geometry.clampLengthMm ?? null}
          onChange={changeDesign}
        />
        <LoadsFields
          loads={loads}
          serviceTempC={inputs.serviceTempC}
          system={system}
          onLoadsChange={(changes) => dispatch({ type: 'loads', changes })}
          onTemperatureChange={(serviceTempC) => dispatch({ type: 'change', changes: { serviceTempC } })}
        />
      </Column>

      <Column
        label="Joint section and joint diagram"
        header={
          <ColumnHeader
            title="Joint section & joint diagram"
            meta={analysis ? `${jointTitle(design)} · Φn ${formatDecimal(analysis.loadFactor, 3, true)}` : jointTitle(design)}
            actions={analysis && <DiagramLegend />}
          />
        }
      >
        {analysis ? (
          <Drawings analysis={analysis} inputs={inputs} system={system} />
        ) : (
          <div className={styles.problem}>
            <Callout status="bad" title="This joint cannot be analysed">
              {results.joint.ok ? null : results.joint.error}
            </Callout>
          </div>
        )}
      </Column>

      <Column
        width="results"
        divider={false}
        wrap
        label="Results"
        header={
          <ColumnHeader
            title="Results"
            actions={
              <Badge variant="reference" size="md">
                VDI 2230-1:2015
              </Badge>
            }
          />
        }
      >
        {analysis && (
          <JointResults
            analysis={analysis}
            system={system}
            stepInputs={{ 'surface-pressure': <PressureInputs design={design} system={system} onChange={changeDesign} /> }}
          />
        )}
      </Column>
    </>
  )
}

/** The joint diagram's lines, in the header bar like the Fit charts' legends. */
function DiagramLegend() {
  return (
    <>
      <LegendItem swatch={<Marker shape="line" color="text" />}>Bolt</LegendItem>
      <LegendItem swatch={<Marker shape="line" color="hole" />}>Clamped parts</LegendItem>
      <LegendItem swatch={<Marker shape="line" color="accent" />}>FA</LegendItem>
      <LegendItem swatch={<Marker shape="line" color="ok" />}>FKR</LegendItem>
    </>
  )
}

function Drawings({ analysis, inputs, system }: { analysis: BoltedJointAnalysis; inputs: BoltInputs; system: UnitSystem }) {
  const { design, loads } = inputs.joint
  const length = (mm: number) => `${formatQuantity('length', system, mm)} ${unitOf('length', system)}`
  return (
    <div className={styles.drawings}>
      <figure className={styles.drawing}>
        <figcaption className={styles.drawingTitle}>Section A–A</figcaption>
        <SectionDiagram analysis={analysis} design={design} />
        <ol className={styles.legend}>
          {design.plates.map((plate, i) => (
            <li key={i}>
              {i + 1} {materialName(plate.materialId)} · {length(plate.thicknessMm)}
            </li>
          ))}
          {design.joint.kind !== 'through-bolt' && (
            <li>
              {design.plates.length + 1} {materialName(design.joint.materialId)} · tapped {length(design.joint.engagementMm)}
            </li>
          )}
          <li>
            pressure cone φ {formatDecimal(analysis.resilience.coneAngleDeg, 1, true)}° · DA {length(design.outerDiameterMm)}
          </li>
        </ol>
      </figure>
      <figure className={styles.drawing}>
        <figcaption className={styles.drawingTitle}>Force – elongation at FV,min</figcaption>
        <JointDiagram analysis={analysis} axialN={loads.axialMaxN} system={system} />
      </figure>
    </div>
  )
}
