// Materials Database page ("Materials" design): filters on the left, the
// E–ρ chart and the matching materials in the centre, the selected material
// with its sources on the right. Opening "#/mat?rev=…" selects the material
// saved in that project revision.
import { useState } from 'react'
import { MATERIALS, materialById } from '../../core/materials'
import { AppLayout } from '../AppLayout'
import { useReopenedRevision } from '../projects/reopenLink'
import { SaveRevisionDialog } from '../projects/SaveRevisionDialog'
import { useProjects } from '../projects/useProjects'
import { useSettings } from '../settings/settings'
import { Badge, Column, ColumnHeader } from '../ui'
import { MaterialDetail } from './MaterialDetail'
import { defaultFilter, matchesFilter, type MaterialFilter } from './materialFilter'
import { MaterialFilters } from './MaterialFilters'
import { materialSnapshot } from './materialProperties'
import styles from './MaterialsPage.module.css'
import { MaterialTable } from './MaterialTable'
import { PropertyChart } from './PropertyChart'

function materialIdOf(inputs: unknown): string | undefined {
  const id = (inputs as { materialId?: unknown } | null)?.materialId
  return typeof id === 'string' ? id : undefined
}

export function MaterialsPage() {
  const { unitSystem } = useSettings()
  const { activeProject } = useProjects()
  const reopened = useReopenedRevision('mat')
  const projectTempC = activeProject?.targets.serviceTempMaxC
  const [filter, setFilter] = useState<MaterialFilter>(() => defaultFilter(projectTempC))
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const shown = MATERIALS.filter((m) => matchesFilter(m, filter))
  const selectedId = pickedId ?? materialIdOf(reopened?.revision.snapshot.inputs) ?? shown[0]?.id ?? null
  const selected = selectedId ? materialById(selectedId) : null
  const temperatureNote =
    activeProject && filter.minServiceTempC === projectTempC ? `◆ from ${activeProject.name}` : undefined

  return (
    <AppLayout section="mat">
      <div className={styles.columns}>
        <Column
          width="filters"
          label="Filters"
          className={styles.filters}
          header={<ColumnHeader title="Filters" meta={`${shown.length} OF ${MATERIALS.length}`} />}
        >
          <MaterialFilters
            filter={filter}
            onChange={setFilter}
            unitSystem={unitSystem}
            temperatureNote={temperatureNote}
          />
        </Column>
        <Column
          label="Materials"
          className={styles.centre}
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
          {shown.length === 0 && <p className={styles.empty}>No material passes these filters.</p>}
        </Column>
        <Column width="results" divider={false} label="Selected material" className={styles.detail}>
          {selected?.ok ? (
            <MaterialDetail material={selected.value} unitSystem={unitSystem} onSaveToProject={() => setSaving(true)} />
          ) : (
            <p className={styles.empty}>Choose a material in the chart or the table.</p>
          )}
        </Column>
      </div>
      {saving && selected?.ok && (
        <SaveRevisionDialog snapshot={materialSnapshot(selected.value)} onClose={() => setSaving(false)} />
      )}
    </AppLayout>
  )
}
