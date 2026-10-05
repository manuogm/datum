// The worked formulas behind a result row, with the standards they come from.
import { Badge, FormulaBlock } from '../../../../app/ui'
import type { FitQuantity } from '../logic/fitQuantities'
import styles from './shared.module.css'

interface QuantityDetailsProps {
  quantities: readonly FitQuantity<string>[]
}

export function QuantityDetails({ quantities }: QuantityDetailsProps) {
  const sources = [...new Set(quantities.map((q) => q.source))]
  return (
    <>
      {quantities.map((q) => (
        <FormulaBlock key={q.key} symbol={q.symbol} formula={q.formula} substitution={q.substitution} result={`${q.value} ${q.unit}`} />
      ))}
      <div className={styles.sources}>
        {sources.map((source) => (
          <Badge key={source} variant="reference" size="sm">
            {source}
          </Badge>
        ))}
      </div>
    </>
  )
}
