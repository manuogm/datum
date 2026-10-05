// ProjectChip: shows which project, part and revision the current
// calculation belongs to; opens the project switcher when clicked.
import styles from './ProjectChip.module.css'
import { Badge } from './Badge'
import { Icon } from './Icon'
import { Marker } from './Marker'

export interface ProjectContext {
  name: string
  part?: string
  rev?: string
}

interface ProjectChipProps extends ProjectContext {
  onClick?: () => void
}

export function ProjectChip({ name, part, rev, onClick }: ProjectChipProps) {
  return (
    <button type="button" className={styles.chip} onClick={onClick} aria-label={`Project ${name}`}>
      <Marker shape="diamond" size={8} />
      <span className={styles.name}>{name}</span>
      {part && (
        <>
          <span className={styles.separator}>/</span>
          <span className={styles.part}>{part}</span>
        </>
      )}
      {rev && (
        <Badge variant="reference" size="sm">
          REV {rev}
        </Badge>
      )}
      <Icon name="chevron-down" className={styles.chevron} />
    </button>
  )
}
