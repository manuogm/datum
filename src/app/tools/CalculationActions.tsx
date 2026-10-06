// The actions a calculation shows in the top bar: Save (writes the inputs on
// screen to the library; "Saved" while there is nothing new) and Report
// (opens the printable A4 report, #/calc/<id>/report). On a phone they show
// their icons only, so the document tabs keep their room.
import { reportHref } from '../router/routes'
import { Button } from '../ui'
import styles from './CalculationActions.module.css'

interface CalculationActionsProps {
  calculationId: string
  unsaved: boolean
  onSave: () => void
}

export function CalculationActions({ calculationId, unsaved, onSave }: CalculationActionsProps) {
  return (
    <>
      <Button size="md" icon="save" onClick={onSave} disabled={!unsaved} title={unsaved ? 'Save (Ctrl+S)' : 'All changes saved'}>
        <span className={styles.label}>{unsaved ? 'Save' : 'Saved'}</span>
      </Button>
      <Button size="md" variant="primary" icon="download" href={reportHref(calculationId)}>
        <span className={styles.label}>Report</span>
      </Button>
    </>
  )
}
