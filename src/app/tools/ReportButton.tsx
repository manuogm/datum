// The "Report" action a calculation shows in the top bar: opens its printable
// A4 report (#/calc/<id>/report).
import { reportHref } from '../router/routes'
import { Button } from '../ui'

export function ReportButton({ calculationId }: { calculationId: string }) {
  return (
    <Button size="md" variant="primary" icon="download" href={reportHref(calculationId)}>
      Report
    </Button>
  )
}
