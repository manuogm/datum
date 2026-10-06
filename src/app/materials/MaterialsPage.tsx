// Materials Database page ("Materials" design): filters on the left, the
// E–ρ chart and the matching materials in the centre, the selected material
// with its sources on the right. A reference page, not a calculation: it is
// opened from the Materials button of the top bar.
import { useState } from 'react'
import { MATERIALS, materialById } from '../../core/materials'
import { AppLayout } from '../AppLayout'
import { useSettings } from '../settings/settings'
import { Badge, Column, ColumnHeader, ColumnRow, EmptyState } from '../ui'
import { MaterialDetail } from './MaterialDetail'
import { defaultFilter, matchesFilter, type MaterialFilter } from './materialFilter'
import { MaterialFilters } from './MaterialFilters'
import styles from './MaterialsPage.module.css'
import { MaterialTable } from './MaterialTable'
import { PropertyChart } from './PropertyChart'

export function MaterialsPage() {
  const { unitSystem } = useSettings()
  const [filter, setFilter] = useState<MaterialFilter>(() => defaultFilter())
  const [pickedId, setPickedId] = useState<string | null>(null)

  const shown = MATERIALS.filter((m) => matchesFilter(m, filter))
  const selectedId = pickedId ?? shown[0]?.id ?? null
  const selected = selectedId ? materialById(selectedId) : null

  return (
    <AppLayout current="materials">
      <ColumnRow>
        <Column
          width="filters"
          label="Filters"
          header={<ColumnHeader title="Filters" meta={`${shown.length} OF ${MATERIALS.length}`} />}
        >
          <MaterialFilters filter={filter} onChange={setFilter} unitSystem={unitSystem} />
        </Column>
        <Column
          label="Materials"
          header={
            <ColumnHeader title="Property chart" actions={<span className={styles.scale}>Log scales · 20 °C · SI</span>}>
              <span className={styles.axes}>
                <Badge variant="reference" size="md">E</Badge>
                vs
                <Badge variant="reference" size="md">ρ</Badge>
              </span>
            </ColumnHeader>
          }
        >
          <div className={styles.chart}>
            <PropertyChart
              materials={MATERIALS}
              isShown={(m) => matchesFilter(m, filter)}
              selectedId={selectedId}
              onSelect={setPickedId}
            />
          </div>
          <MaterialTable materials={shown} selectedId={selectedId} onSelect={setPickedId} unitSystem={unitSystem} />
          {shown.length === 0 && <EmptyState>No material passes these filters.</EmptyState>}
        </Column>
        <Column width="results" divider={false} wrap label="Selected material">
          {selected?.ok ? (
            <MaterialDetail material={selected.value} unitSystem={unitSystem} />
          ) : (
            <EmptyState>Choose a material in the chart or the table.</EmptyState>
          )}
        </Column>
      </ColumnRow>
    </AppLayout>
  )
}
