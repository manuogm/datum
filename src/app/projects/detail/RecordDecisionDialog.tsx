// RecordDecisionDialog: records a design decision by hand (decisions can
// also be recorded while saving a revision). It starts as proposed until the
// approver signs it off.
import { useState } from 'react'
import { currentRevision, partOf, TOOLS, type Project } from '../../../core/projects'
import { Button, Dialog, Field, Select, TextArea } from '../../ui'
import { FormError } from '../FormError'
import { useProjects } from '../useProjects'

interface RecordDecisionDialogProps {
  project: Project
  onClose: () => void
}

const NO_BASIS = ''

export function RecordDecisionDialog({ project, onClose }: RecordDecisionDialogProps) {
  const { actions } = useProjects()
  const [title, setTitle] = useState('')
  const [rationale, setRationale] = useState('')
  const [basisId, setBasisId] = useState(NO_BASIS)
  const [error, setError] = useState<string | null>(null)

  const bases = project.calculations.map((calculation) => {
    const { rev } = currentRevision(calculation)
    return {
      value: calculation.id,
      label: `${calculation.id} Rev ${rev} · ${TOOLS[calculation.tool].name} · ${partOf(project, calculation.partId).name}`,
      basis: { calculationId: calculation.id, rev },
    }
  })

  const record = () => {
    const basis = bases.find((b) => b.value === basisId)?.basis
    const result = actions.recordDecision(project.id, { title, rationale, basis })
    if (result.ok) onClose()
    else setError(result.error)
  }

  return (
    <Dialog
      title="Record design decision"
      subtitle={project.name}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={record}>
            Record decision
          </Button>
        </>
      }
    >
      <Field label="Decision" size="md" data-autofocus value={title} onChange={(e) => setTitle(e.target.value)} />
      <TextArea label="Why" value={rationale} onChange={(e) => setRationale(e.target.value)} />
      <Select
        label="Based on"
        size="md"
        options={[{ value: NO_BASIS, label: 'No calculation' }, ...bases]}
        value={basisId}
        onChange={setBasisId}
      />
      <FormError message={error} />
    </Dialog>
  )
}
