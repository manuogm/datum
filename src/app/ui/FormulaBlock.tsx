// FormulaBlock: a result worked out in three mono lines, as in the expanded
// results rows and on the report:
//   C_max = D_max − d_min
//         = 25.021 − 24.980
//         = 41 µm
import styles from './FormulaBlock.module.css'
import { MathText } from './MathText'

interface FormulaBlockProps {
  symbol: string
  formula: string
  substitution: string
  /** The value with its unit. */
  result: string
}

export function FormulaBlock({ symbol, formula, substitution, result }: FormulaBlockProps) {
  return (
    <div className={styles.block}>
      <div className={styles.definition}>
        <MathText>{`${symbol} = ${formula}`}</MathText>
      </div>
      <div>
        <span className={styles.equals}>= </span>
        <MathText>{substitution}</MathText>
      </div>
      <div>
        <span className={styles.equals}>= </span>
        <span className={styles.result}>{result}</span>
      </div>
    </div>
  )
}
