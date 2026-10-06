// One tab per load case with the utilisation of its governing bolt, coloured
// by verdict; a load case that cannot be analysed shows a dash.
import { Chip, cx } from '../../../../app/ui'
import type { LoadCaseResult } from '../logic/boltResults'
import { formatUtilisation, utilisationTone } from '../logic/verdict'
import styles from './pattern.module.css'

const TONE_CLASS = { ok: styles.okText, warn: styles.warnText, bad: styles.badText }

interface LoadCaseTabsProps {
  loadCases: readonly LoadCaseResult[]
  selected: string
  onSelect: (id: string) => void
}

export function LoadCaseTabs({ loadCases, selected, onSelect }: LoadCaseTabsProps) {
  return (
    <div className={styles.tabs} role="group" aria-label="Load case">
      {loadCases.map(({ loadCase, analysis }) => {
        const governing = analysis.ok ? analysis.value.governing : null
        return (
          <Chip key={loadCase.id} variant="option" selected={loadCase.id === selected} onClick={() => onSelect(loadCase.id)}>
            {loadCase.id} {loadCase.name}
            <span className={cx(styles.tabValue, governing ? TONE_CLASS[utilisationTone(governing.utilisation, governing.status)] : styles.badText)}>
              {governing ? formatUtilisation(governing.utilisation) : '—'}
            </span>
          </Chip>
        )
      })}
    </div>
  )
}
