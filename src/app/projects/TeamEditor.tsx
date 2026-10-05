// TeamEditor: the project team as avatars. Members are added by name and
// role; the owner stays. The member with the role "Approver" signs off
// design decisions.
import { useState } from 'react'
import type { TeamMember } from '../../core/projects'
import { Avatar, Button, Field, MonoLabel, Select } from '../ui'
import { initialsOf } from './projectDraft'
import styles from './TeamEditor.module.css'

const ROLES = ['Approver', 'Design', 'Stress', 'Manufacturing'] as const
type Role = (typeof ROLES)[number]
const ROLE_OPTIONS = ROLES.map((role) => ({ value: role, label: role }))

interface TeamEditorProps {
  team: TeamMember[]
  onChange: (team: TeamMember[]) => void
}

export function TeamEditor({ team, onChange }: TeamEditorProps) {
  const [adding, setAdding] = useState(false)
  const approver = team.find((m) => m.role === 'Approver')
  return (
    <div className={styles.team} role="group" aria-label="Team">
      <MonoLabel>Team</MonoLabel>
      <div className={styles.row}>
        {team.map((member, index) =>
          index === 0 ? (
            <span key={member.initials + member.name} title={`${member.name} · ${member.role}`}>
              <Avatar initials={member.initials} name={`${member.name}, ${member.role}`} />
            </span>
          ) : (
            <button
              key={member.initials + member.name}
              type="button"
              className={styles.member}
              title={`${member.name} · ${member.role} (click to remove)`}
              aria-label={`Remove ${member.name}, ${member.role}`}
              onClick={() => onChange(team.filter((_, i) => i !== index))}
            >
              <Avatar initials={member.initials} />
            </button>
          ),
        )}
        {!adding && (
          <button type="button" className={styles.add} aria-label="Add team member" onClick={() => setAdding(true)}>
            +
          </button>
        )}
        <span className={styles.note}>
          {approver ? `${approver.name} approves decisions` : 'Add an approver to sign off decisions'}
        </span>
      </div>
      {adding && (
        <AddMember
          defaultRole={approver ? 'Design' : 'Approver'}
          onAdd={(member) => {
            onChange([...team, member])
            setAdding(false)
          }}
          onCancel={() => setAdding(false)}
        />
      )}
    </div>
  )
}

interface AddMemberProps {
  defaultRole: Role
  onAdd: (member: TeamMember) => void
  onCancel: () => void
}

function AddMember({ defaultRole, onAdd, onCancel }: AddMemberProps) {
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>(defaultRole)
  const add = () => name.trim() && onAdd({ name: name.trim(), initials: initialsOf(name), role })
  return (
    <div className={styles.addRow}>
      <Field
        size="sm"
        className={styles.name}
        aria-label="New member name"
        placeholder="Name, e.g. J. Okafor"
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            add()
          }
        }}
      />
      <Select size="sm" aria-label="New member role" options={ROLE_OPTIONS} value={role} onChange={setRole} />
      <Button size="sm" onClick={add} disabled={!name.trim()}>
        Add
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  )
}
