// ProjectSidebar: the left column of a project page: parts (choosing one
// filters the history), design targets and team.
import type { Project } from '../../../core/projects'
import { Avatar, cx, Marker, MonoLabel } from '../../ui'
import { DesignTargetsList } from '../DesignTargets'
import styles from './ProjectSidebar.module.css'

interface ProjectSidebarProps {
  project: Project
  /** Selected part, or null for all parts. */
  partId: string | null
  onPartChange: (partId: string | null) => void
  onEditTargets: () => void
}

export function ProjectSidebar({ project, partId, onPartChange, onEditTargets }: ProjectSidebarProps) {
  const count = (id: string | null) => project.calculations.filter((c) => id === null || c.partId === id).length
  const items = [{ id: null, name: 'All parts' }, ...project.parts]
  return (
    <aside className={styles.sidebar} aria-label="Project">
      <section className={styles.section}>
        <MonoLabel as="h2">Parts</MonoLabel>
        <ul className={styles.parts}>
          {items.map((part) => {
            const selected = part.id === partId
            return (
              <li key={part.id ?? 'all'}>
                <button
                  type="button"
                  className={cx(styles.part, selected && styles.selected)}
                  aria-pressed={selected}
                  onClick={() => onPartChange(part.id)}
                >
                  <Marker shape="dot" size={6} color={selected ? 'accent' : 'faint'} />
                  <span className={styles.partName}>{part.name}</span>
                  <span className={styles.count}>{count(part.id)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>
      <section className={styles.section}>
        <div className={styles.heading}>
          <MonoLabel as="h2">Design targets</MonoLabel>
          <button type="button" className={styles.edit} onClick={onEditTargets}>
            Edit
          </button>
        </div>
        <DesignTargetsList targets={project.targets} />
        <p className={styles.note}>Applied to every calculation in this project.</p>
      </section>
      <section className={styles.section}>
        <MonoLabel as="h2">Team</MonoLabel>
        <ul className={styles.team}>
          {project.team.map((member) => (
            <li key={member.initials + member.name} className={styles.member}>
              <Avatar initials={member.initials} size="sm" />
              <span className={styles.memberName}>{member.name}</span>
              <span className={styles.role}>{member.role}</span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}
