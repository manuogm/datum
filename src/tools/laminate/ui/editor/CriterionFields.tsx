// How the plies are judged: the failure criterion, and the reserve factor the
// laminate must reach.
import { InputWell, NumberInput, PanelSection, Select, ValueRow } from '../../../../app/ui'
import { formatDecimal } from '../../../../core/units'
import { DEFAULT_TSAI_WU_F12_STAR, type FailureCriterion } from '../../calc'
import { CRITERION_LABELS } from '../logic/labels'
import { CRITERIA } from '../state/readInputs'

const OPTIONS = CRITERIA.map((value) => ({ value, label: CRITERION_LABELS[value] }))

interface CriterionFieldsProps {
  criterion: FailureCriterion
  targetReserveFactor: number
  onChange: (changes: { criterion?: FailureCriterion; targetReserveFactor?: number }) => void
}

export function CriterionFields({ criterion, targetReserveFactor, onChange }: CriterionFieldsProps) {
  return (
    <PanelSection label="Ply failure">
      <Select
        size="md"
        aria-label="Failure criterion"
        options={OPTIONS}
        value={criterion}
        onChange={(value) => onChange({ criterion: value })}
        meta={criterion === 'tsai-wu' ? `F12* ${formatDecimal(DEFAULT_TSAI_WU_F12_STAR, 1)}` : undefined}
      />
      <ValueRow
        label="Target reserve factor"
        value={
          <InputWell>
            <NumberInput
              label="Target reserve factor"
              value={targetReserveFactor}
              onChange={(value) => {
                if (value > 0) onChange({ targetReserveFactor: value })
              }}
            />
          </InputWell>
        }
      />
    </PanelSection>
  )
}
