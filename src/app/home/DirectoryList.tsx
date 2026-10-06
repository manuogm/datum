// DirectoryList: the rows of a folder on Home: its folders first, then its
// calculations, each with what it holds or what it found. The name link
// covers the whole row; the row menu sits above it.
import { TOOLS, folderContents, type Calculation, type CalculationStatus, type Folder, type Library } from '../../core/library'
import { countOf } from '../format/count'
import { formatActivityTime } from '../format/formatActivityTime'
import { calcHref, folderHref } from '../router/routes'
import { TOOL_ICONS } from '../shell/toolIcons'
import { cx, Icon, Marker, type Tone } from '../ui'
import styles from './DirectoryList.module.css'
import type { Entry } from './entry'
import { RowMenu, type RowMenuItem } from './RowMenu'

const STATUS: Record<CalculationStatus, { tone: Tone; label: string }> = {
  pass: { tone: 'ok', label: 'Pass' },
  review: { tone: 'warn', label: 'Review' },
  fail: { tone: 'bad', label: 'Fail' },
}

interface DirectoryListProps {
  library: Library
  folders: readonly Folder[]
  calculations: readonly Calculation[]
  onRename: (entry: Entry) => void
  onDuplicate: (entry: Entry) => void
  onMove: (entry: Entry) => void
  onDelete: (entry: Entry) => void
}

export function DirectoryList({ library, folders, calculations, onRename, onDuplicate, onMove, onDelete }: DirectoryListProps) {
  const menu = (entry: Entry): RowMenuItem[] => [
    { label: 'Rename…', onSelect: () => onRename(entry) },
    ...(entry.kind === 'calculation' ? [{ label: 'Duplicate', onSelect: () => onDuplicate(entry) }] : []),
    { label: 'Move to…', onSelect: () => onMove(entry) },
    { label: 'Delete…', onSelect: () => onDelete(entry), danger: true },
  ]
  return (
    <div className={styles.table} role="table" aria-label="Folder contents">
      <div className={cx(styles.row, styles.header)} role="row">
        <span role="columnheader">Name</span>
        <span role="columnheader" className={styles.wide}>Tool</span>
        <span role="columnheader">Result</span>
        <span role="columnheader" className={styles.medium}>Last edited</span>
        <span role="columnheader" className={styles.menuColumn}>
          <span className={styles.hidden}>Actions</span>
        </span>
      </div>
      {folders.map((folder) => {
        const contents = folderContents(library, folder.id)
        const entry: Entry = { kind: 'folder', folder }
        return (
          <div key={folder.id} className={cx(styles.row, styles.body)} role="row">
            <div className={styles.nameCell} role="cell">
              <Icon name="folder" size={16} className={styles.folderIcon} />
              <a className={styles.name} href={folderHref(folder.id)}>
                {folder.name}
              </a>
            </div>
            <span role="cell" className={cx(styles.muted, styles.wide)}>
              Folder
            </span>
            <span role="cell" className={styles.muted}>
              {contents.folders + contents.calculations === 0
                ? 'Empty'
                : [contents.folders > 0 && countOf(contents.folders, 'folder'), countOf(contents.calculations, 'calculation')]
                    .filter(Boolean)
                    .join(' · ')}
            </span>
            <span role="cell" className={cx(styles.muted, styles.medium)} />
            <span role="cell" className={styles.menuColumn}>
              <RowMenu label={`Actions for folder ${folder.name}`} items={menu(entry)} />
            </span>
          </div>
        )
      })}
      {calculations.map((calculation) => {
        const { summary } = calculation
        const status = summary ? STATUS[summary.status] : null
        const headline = summary?.figures[0]
        return (
          <div key={calculation.id} className={cx(styles.row, styles.body)} role="row">
            <div className={styles.nameCell} role="cell">
              <Icon name={TOOL_ICONS[calculation.tool]} size={14} className={styles.toolIcon} />
              <a className={styles.name} href={calcHref(calculation.id)}>
                {calculation.name}
              </a>
            </div>
            <span role="cell" className={cx(styles.muted, styles.wide)}>
              {TOOLS[calculation.tool].name}
            </span>
            <span role="cell" className={styles.result}>
              {summary && status ? (
                <>
                  <Marker shape="dot" color={status.tone} label={status.label} />
                  <span className={styles.title}>{summary.title}</span>
                  {headline && (
                    <span className={styles.figure}>
                      {headline.label} {headline.value}
                      {headline.unit && ` ${headline.unit}`}
                    </span>
                  )}
                </>
              ) : (
                <span className={styles.muted}>No result: open it to see why</span>
              )}
            </span>
            <span role="cell" className={cx(styles.muted, styles.medium)}>
              {formatActivityTime(new Date(calculation.updatedAt))}
            </span>
            <span role="cell" className={styles.menuColumn}>
              <RowMenu label={`Actions for ${calculation.name}`} items={menu({ kind: 'calculation', calculation })} />
            </span>
          </div>
        )
      })}
    </div>
  )
}
