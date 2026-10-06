// The actions a calculation shows in the top bar: Save (writes the inputs on
// screen to the library; "Saved" while there is nothing new) and Report
// (opens the printable A4 report, #/calc/<id>/report).
import { reportHref } from '../router/routes'
import { Button } from '../ui'

interface CalculationActionsProps {
  calculationId: string
  unsaved: boolean
  onSave: () => void
}

export function CalculationActions({ calculationId, unsaved, onSave }: CalculationActionsProps) {
  return (
    <>
      <Button size="md" icon="save" onClick={onSave} disabled={!unsaved} title={unsaved ? 'Save (Ctrl+S)' : 'All changes saved'}>
        {unsaved ? 'Save' : 'Saved'}
      </Button>
      <Button size="md" variant="primary" icon="download" href={reportHref(calculationId)}>
        Report
      </Button>
    </>
  )
}
