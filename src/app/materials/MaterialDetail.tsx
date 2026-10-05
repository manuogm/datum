// MaterialDetail: the right column of the Materials page: the selected
// material's properties (each marked with its reference number), the
// references themselves, where the material is used in projects, and the
// action to save it as a project part's material.
import { MATERIAL_FAMILIES, type Material, type SourceKind } from '../../core/materials'
import { materialUsage } from '../../core/projects'
import type { UnitSystem } from '../../core/units'
import { useProjects } from '../projects/useProjects'
import { reopenRevisionHref } from '../projects/reopenLink'
import { Badge, Button, Marker, markerColor, PanelSection, type Tone } from '../ui'
import { mainSourceKind } from './materialFilter'
import styles from './MaterialDetail.module.css'
import { materialDetails } from './materialProperties'

const SOURCE_BADGE: Record<SourceKind, { tone: Tone; text: string }> = {
  standard: { tone: 'ok', text: 'Standard minimums' },
  handbook: { tone: 'hole', text: 'Handbook typical' },
  datasheet: { tone: 'warn', text: 'Producer typical' },
  judgement: { tone: 'neutral', text: 'Screening estimate' },
}

interface MaterialDetailProps {
  material: Material
  unitSystem: UnitSystem
  onSaveToProject: () => void
}

export function MaterialDetail({ material, unitSystem, onSaveToProject }: MaterialDetailProps) {
  const { projects, active } = useProjects()
  const { rows, sources } = materialDetails(material, unitSystem)
  const badge = SOURCE_BADGE[mainSourceKind(material)]
  const usage = materialUsage(projects, material.id)
  const subtitle = [material.spec, material.condition, material.designation].filter(Boolean).join(' · ')
  return (
    <div className={styles.detail}>
      <header className={styles.head}>
        <div className={styles.kicker}>
          <span className={styles.family} style={{ color: markerColor(`cat-${material.family}`) }}>
            <Marker shape="dot" size={7} color={`cat-${material.family}`} />
            {MATERIAL_FAMILIES[material.family]}
          </span>
          <Badge tone={badge.tone}>{badge.text}</Badge>
        </div>
        <h2 className={styles.name}>{material.name}</h2>
        <span className={styles.spec}>{subtitle}</span>
      </header>
      <dl className={styles.properties}>
        {rows.map((row) => (
          <div key={row.label} className={styles.property}>
            <dt className={styles.label}>{row.label}</dt>
            <dd className={styles.value}>
              {row.value} <span className={styles.unit}>{row.value !== '—' && row.unit}</span>
              <sup className={styles.ref} aria-label={`source ${row.sourceNumber}`}>
                {row.sourceNumber}
              </sup>
            </dd>
          </div>
        ))}
      </dl>
      <PanelSection label="Sources">
        <ol className={styles.sources}>
          {sources.map(({ number, source, properties }) => (
            <li key={number} className={styles.source}>
              <span className={styles.ref}>{number}</span>
              <span>
                {source.reference}
                <span className={styles.covers}>{properties.join(', ')}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className={styles.caution}>
          Room-temperature values for screening, not design allowables (A-/B-basis).
        </p>
      </PanelSection>
      <PanelSection label="Used in" grow>
        {usage.length === 0 ? (
          <p className={styles.unused}>Not used in any project yet.</p>
        ) : (
          <ul className={styles.usage}>
            {usage.map(({ project, part, calculation, revision }) => (
              <li key={revision.id}>
                <a className={styles.use} href={reopenRevisionHref(project.id, revision)}>
                  <Marker shape="diamond" size={7} color={project.id === active?.projectId ? 'accent' : 'faint'} />
                  <span className={styles.useName}>
                    {project.name} · {part.name}
                  </span>
                  <span className={styles.useId}>{calculation.id}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </PanelSection>
      <div className={styles.actions}>
        <Button variant="primary" block onClick={onSaveToProject}>
          Save to project
        </Button>
      </div>
    </div>
  )
}
