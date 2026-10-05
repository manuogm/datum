// ProjectForm: name, code, programme, parts, design targets and team of a
// project. Used by the New project drawer and the project's Settings tab.
import { useId } from 'react'
import type { ProjectDraft } from '../../core/projects'
import { Field } from '../ui'
import { DesignTargetsEditor } from './DesignTargets'
import { PartsEditor } from './PartsEditor'
import styles from './ProjectForm.module.css'
import { TeamEditor } from './TeamEditor'

interface ProjectFormProps {
  draft: ProjectDraft
  onChange: (draft: ProjectDraft) => void
  /** The project code: the next free one for a new project. */
  code: string
  /** Programmes of existing projects, offered as suggestions. */
  programs: readonly string[]
  lockedPartIds?: ReadonlySet<string>
}

export function ProjectForm({ draft, onChange, code, programs, lockedPartIds }: ProjectFormProps) {
  const programList = useId()
  const set = <K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) => onChange({ ...draft, [key]: value })
  return (
    <>
      <Field
        label="Name"
        size="md"
        data-autofocus
        required
        value={draft.name}
        placeholder="e.g. Rear brake caliper bracket"
        onChange={(event) => set('name', event.target.value)}
      />
      <div className={styles.pair}>
        <Field label="Code" size="md" mono readOnly value={code} className={styles.code} />
        <Field
          label="Program"
          size="md"
          list={programList}
          value={draft.program}
          placeholder="e.g. FW-27"
          onChange={(event) => set('program', event.target.value)}
        />
        <datalist id={programList}>
          {programs.map((program) => (
            <option key={program} value={program} />
          ))}
        </datalist>
      </div>
      <PartsEditor parts={draft.parts} onChange={(parts) => set('parts', parts)} lockedPartIds={lockedPartIds} />
      <DesignTargetsEditor targets={draft.targets} onChange={(targets) => set('targets', targets)} />
      <TeamEditor team={draft.team} onChange={(team) => set('team', team)} />
    </>
  )
}
