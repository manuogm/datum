// MaterialDetail: the right column of the Materials page: the selected
// material's properties (each marked with its reference number), a composite
// ply's lamina data and the references themselves.
import { MATERIAL_FAMILIES, type Material, type SourceKind } from '../../core/materials'
import type { UnitSystem } from '../../core/units'
import { Badge, cx, Marker, markerColor, PanelSection, type Tone } from '../ui'
import { mainSourceKind } from './materialFilter'
import styles from './MaterialDetail.module.css'
import { materialDetails, type PropertyRow } from './materialProperties'

const LAMINA_FORM = { ud: 'unidirectional', fabric: 'woven fabric, 1 = warp' } as const

const SOURCE_BADGE: Record<SourceKind, { tone: Tone; text: string }> = {
  standard: { tone: 'ok', text: 'Standard minimums' },
  handbook: { tone: 'hole', text: 'Handbook typical' },
  datasheet: { tone: 'warn', text: 'Producer typical' },
  judgement: { tone: 'neutral', text: 'Screening estimate' },
}

interface MaterialDetailProps {
  material: Material
  unitSystem: UnitSystem
}

export function MaterialDetail({ material, unitSystem }: MaterialDetailProps) {
  const { rows, lamina, sources } = materialDetails(material, unitSystem)
  const badge = SOURCE_BADGE[mainSourceKind(material)]
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
      <PropertyList rows={rows} />
      {lamina && (
        <PanelSection label="Ply data" aside={LAMINA_FORM[lamina.form]}>
          <PropertyList rows={lamina.rows} inSection />
        </PanelSection>
      )}
      <PanelSection label="Sources" grow>
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
    </div>
  )
}

/** inSection: inside a PanelSection, which already pads and rules it. */
function PropertyList({ rows, inSection = false }: { rows: readonly PropertyRow[]; inSection?: boolean }) {
  return (
    <dl className={cx(styles.properties, inSection && styles.inSection)}>
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
  )
}
