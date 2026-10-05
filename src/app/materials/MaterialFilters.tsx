// MaterialFilters: the left column of the Materials page: search, family,
// property sliders and data source.
import { MATERIAL_FAMILIES, type MaterialFamily, type SourceKind } from '../../core/materials'
import { formatQuantity, unitOf, type UnitSystem } from '../../core/units'
import { Checkbox, Chip, Marker, PanelSection, SearchField, Slider } from '../ui'
import { SLIDER_RANGES, SOURCE_FILTERS, type MaterialFilter } from './materialFilter'
import styles from './MaterialFilters.module.css'

interface MaterialFiltersProps {
  filter: MaterialFilter
  onChange: (filter: MaterialFilter) => void
  unitSystem: UnitSystem
  /** Shown beside PROPERTIES while the temperature still comes from the active project. */
  temperatureNote?: string
}

function toggled<T>(set: ReadonlySet<T>, item: T): Set<T> {
  const next = new Set(set)
  if (next.has(item)) next.delete(item)
  else next.add(item)
  return next
}

export function MaterialFilters({ filter, onChange, unitSystem, temperatureNote }: MaterialFiltersProps) {
  const set = <K extends keyof MaterialFilter>(key: K, value: MaterialFilter[K]) => onChange({ ...filter, [key]: value })
  const [minDensity, maxDensity] = filter.densityGPerCm3
  const density = (value: number) => formatQuantity('density', unitSystem, value)
  return (
    <>
      <PanelSection>
        <SearchField
          label="Search materials"
          placeholder="Name, spec, UNS…"
          size="sm"
          value={filter.query}
          onChange={(event) => set('query', event.target.value)}
        />
      </PanelSection>
      <PanelSection label="Family">
        <div className={styles.chips}>
          {(Object.entries(MATERIAL_FAMILIES) as [MaterialFamily, string][]).map(([family, name]) => (
            <Chip
              key={family}
              variant="filter"
              selected={filter.families.has(family)}
              leading={<Marker shape="dot" size={7} color={`cat-${family}`} />}
              onClick={() => set('families', toggled(filter.families, family))}
            >
              {name}
            </Chip>
          ))}
        </div>
      </PanelSection>
      <PanelSection label="Properties" aside={temperatureNote}>
        <div className={styles.sliders}>
          <Slider
            mode="atLeast"
            label="Service temp. ≥"
            name="Minimum service temperature"
            valueText={`${formatQuantity('temperature', unitSystem, filter.minServiceTempC)} ${unitOf('temperature', unitSystem)}`}
            {...SLIDER_RANGES.serviceTempC}
            value={filter.minServiceTempC}
            onChange={(value) => set('minServiceTempC', value)}
          />
          <Slider
            mode="range"
            label="Density ρ"
            name="Density"
            valueText={`${density(minDensity)} – ${density(maxDensity)} ${unitOf('density', unitSystem)}`}
            {...SLIDER_RANGES.densityGPerCm3}
            value={filter.densityGPerCm3}
            onChange={(bounds) => set('densityGPerCm3', bounds)}
          />
          <Slider
            mode="atLeast"
            label={
              <>
                Yield R<sub>p0.2</sub> ≥
              </>
            }
            name="Minimum yield strength"
            valueText={`${formatQuantity('strength', unitSystem, filter.minYieldMPa)} ${unitOf('strength', unitSystem)}`}
            {...SLIDER_RANGES.yieldMPa}
            value={filter.minYieldMPa}
            onChange={(value) => set('minYieldMPa', value)}
          />
        </div>
      </PanelSection>
      <PanelSection label="Data source">
        <div className={styles.sources}>
          {SOURCE_FILTERS.map(({ kind, label }) => (
            <Checkbox
              key={kind}
              checked={filter.sourceKinds.has(kind)}
              onChange={() => set('sourceKinds', toggled<SourceKind>(filter.sourceKinds, kind))}
            >
              {label}
            </Checkbox>
          ))}
        </div>
      </PanelSection>
    </>
  )
}
