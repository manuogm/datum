// One tab per load case. On Results each tab also shows the utilisation of
// its governing bolt, coloured by verdict (a dash when it cannot be analysed);
// on the Load cases step it is a plain switch between the cases.
import { Chip, cx } from '../../../../app/ui'
import type { LoadCaseResult } from '../logic/boltResults'
import { formatUtilisation, utilisationTone } from '../logic/verdict'
import styles from './pattern.module.css'

const TONE_CLASS = { ok: styles.okText, warn: styles.warnText, bad: styles.badText }

interface LoadCaseTabsProps {
  loadCases: readonly LoadCaseResult[]
  selected: string
  onSelect: (id: string) => void
  /** Show each case's utilisation (Results). */
  withUtilisation?: boolean
}

export function LoadCaseTabs({ loadCases, selected, onSelect, withUtilisation = true }: LoadCaseTabsProps) {
  return (
    <div className={styles.tabs} role="group" aria-label="Load case">
      {loadCases.map(({ loadCase, analysis }) => {
        const governing = analysis.ok ? analysis.value.governing : null
        return (
          <Chip key={loadCase.id} variant="option" selected={loadCase.id === selected} onClick={() => onSelect(loadCase.id)}>
            {loadCase.id} {loadCase.name}
            {withUtilisation && (
              <span className={cx(styles.tabValue, governing ? TONE_CLASS[utilisationTone(governing.utilisation, governing.status)] : styles.badText)}>
                {governing ? formatUtilisation(governing.utilisation) : '—'}
              </span>
            )}
          </Chip>
        )
      })}
    </div>
  )
}
