// One advisor candidate (the best match, or the fit compared with it) in the
// results' details: its fit type, the advisor's checks and the assembly
// temperatures for a thermal assembly.
import { Badge, CheckRow, PanelSection, Readout } from '../../../../app/ui'
import type { UnitSystem } from '../../../../core/units'
import type { FitCandidate } from '../../advisor'
import { assemblyTemperatures } from '../logic/assemblyTemperatures'
import { CHECK_ICON, FIT_TYPE_LABEL } from '../shared/labels'
import styles from './advisor.module.css'

interface CandidateSummaryProps {
  candidate: FitCandidate
  title: string
  system: UnitSystem
}

/** Designation, fit type at 20 °C, the advisor's checks and the assembly temperatures of one candidate. */
export function CandidateSummary({ candidate, title, system }: CandidateSummaryProps) {
  return (
    <PanelSection label={`${title} · score ${candidate.score}`}>
      <div className={styles.designation}>
        <Readout value={candidate.fit.designation} font="sans" size="sm" />
        <Badge variant="outlined" tone="hole">
          {FIT_TYPE_LABEL[candidate.fit.fitType]}
        </Badge>
      </div>
      <div className={styles.checks}>
        {candidate.checks.map((check) => (
          <CheckRow key={check.id} status={CHECK_ICON[check.status]} label={check.message} />
        ))}
        {assemblyTemperatures(candidate.thermalAssembly, system).map((row) => (
          <CheckRow key={row.label} status={CHECK_ICON.warn} label={row.label} value={row.value} />
        ))}
      </div>
    </PanelSection>
  )
}
