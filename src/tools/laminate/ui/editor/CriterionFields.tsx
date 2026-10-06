// How the plies are judged: the reserve factor the laminate must reach, and
// the failure criterion (Tsai-Wu unless changed, with its F12* noted).
import { InputWell, NumberInput, Select, ValueRow } from '../../../../app/ui'
import { formatDecimal } from '../../../../core/units'
import { DEFAULT_TSAI_WU_F12_STAR, type FailureCriterion } from '../../calc'
import { CRITERION_LABELS } from '../logic/labels'
import { CRITERIA } from '../state/readInputs'

const OPTIONS = CRITERIA.map((value) => ({ value, label: CRITERION_LABELS[value] }))

export function TargetField({ value, onChange }: { value: number; onChange: (targetReserveFactor: number) => void }) {
  return (
    <ValueRow
      label="Target reserve factor"
      value={
        <InputWell>
          <NumberInput
            label="Target reserve factor"
            value={value}
            onChange={(next) => {
              if (next > 0) onChange(next)
            }}
          />
        </InputWell>
      }
    />
  )
}

export function CriterionField({ value, onChange }: { value: FailureCriterion; onChange: (criterion: FailureCriterion) => void }) {
  return (
    <Select
      size="md"
      aria-label="Failure criterion"
      options={OPTIONS}
      value={value}
      onChange={onChange}
      meta={value === 'tsai-wu' ? `F12* ${formatDecimal(DEFAULT_TSAI_WU_F12_STAR, 1)}` : undefined}
    />
  )
}
