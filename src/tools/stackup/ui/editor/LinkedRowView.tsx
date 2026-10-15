// An assembly's linked part stack as a row of the chain (design §6.1). It
// reads differently from a typed dimension: the part's name and the link's
// state where the label would be, the part's nominal and worst-case
// deviations read-only. Its details show both results of the part, where it
// comes from, and the link's actions. "Open in a tab" opens the part's own
// calculation; this assembly stays open in its tab.
import { useId, type ReactNode } from 'react'
import { calcHref } from '../../../../app/router/routes'
import { Badge, Button, Icon, cx } from '../../../../app/ui'
import type { UnitSystem } from '../../../../core/units'
import { deviations, len, plusMinus, range, sigma } from '../logic/format'
import { LINK_BADGE, isBroken, linkNote, partResultText, type ResolvedLink } from '../logic/links'
import { savedText } from '../logic/savedText'
import { lowerName } from '../logic/verdict'
import type { LinkedRow } from '../state/stackInputs'
import { DirectionButton } from './ContributorList'
import { DetailRow } from './DimensionDetails'
import styles from './editor.module.css'

interface LinkedRowViewProps {
  row: LinkedRow
  link: ResolvedLink | undefined
  index: number
  system: UnitSystem
  handle: ReactNode
  expanded: boolean
  onToggle: () => void
  onFlip: () => void
  onRelink: () => void
  onMakeDimension: () => void
  onRemove: () => void
  error: string | null
  /** What to check on the row, under its line. */
  notes?: ReactNode
}

export function LinkedRowView(props: LinkedRowViewProps) {
  const { row, link, index, system, handle, expanded, onToggle, onFlip, error, notes } = props
  const detailsId = useId()
  const stack = link?.stack ?? row.last.stack
  const partName = link?.partName || row.last.partName || row.last.calculationName
  const state = link?.state ?? 'linked'
  const badge = LINK_BADGE[state]
  const note = link ? linkNote(system, link) : null
  const missing = state === 'missing'
  return (
    <>
      <div className={cx(styles.line, styles.linkedLine)}>
        {handle}
        <DirectionButton sensitivity={row.sensitivity} index={index} onFlip={onFlip} />
        <div className={styles.linkBlock}>
          <span className={styles.linkTitle}>
            <Icon name="link" className={styles.linkIcon} />
            <span className={styles.partName}>{partName}</span>
            {link?.unsavedEdits && <span className={styles.unsavedDot} title="Unsaved edits in its tab" aria-label="has unsaved edits" />}
            {!missing && (
              <a className={styles.openLink} href={calcHref(row.calcId)} aria-label={`Open ${partName} in a tab`} title="Open in a tab" onClick={(event) => event.stopPropagation()}>
                <Icon name="open" />
              </a>
            )}
          </span>
          <span className={styles.linkSub}>
            <Badge tone={badge.tone} size="sm">
              {badge.text.toUpperCase()}
            </Badge>
            <span className={styles.resultName}>{lowerName(link?.resultName ?? row.last.resultName)}</span>
          </span>
        </div>
        <span className={cx(styles.readOnly, styles.linkNominal)}>{len(system, stack.nominal)}</span>
        <span className={cx(styles.readOnly, styles.linkTolerance)}>{deviations(system, stack.upperDeviation, stack.lowerDeviation)}</span>
        <span className={styles.halfBand}>{plusMinus(system, (stack.upperDeviation - stack.lowerDeviation) / 2)}</span>
        <button
          type="button"
          className={styles.chevron}
          aria-expanded={expanded}
          aria-controls={detailsId}
          aria-label={`${expanded ? 'Hide' : 'Show'} the details of row ${index + 1}`}
          onClick={(event) => {
            event.stopPropagation()
            onToggle()
          }}
        >
          <Icon name="chevron-down" />
        </button>
      </div>
      {note && <p className={cx(styles.linkNote, isBroken(state) && styles.linkNoteBad)}>{note}</p>}
      {isBroken(state) && !expanded && (
        <div className={styles.linkActionsInline}>
          <BrokenActions {...props} />
        </div>
      )}
      {error && <p className={styles.rowError}>{error}</p>}
      {notes}
      <div id={detailsId} hidden={!expanded} className={styles.details}>
        {expanded && <LinkedDetails {...props} partName={partName} />}
      </div>
    </>
  )
}

/** Relink… and Make it a dimension (Open in a tab when the part is there but its chain fails). */
function BrokenActions({ row, link, onRelink, onMakeDimension }: LinkedRowViewProps) {
  return (
    <>
      {link?.state === 'part-fails' && (
        <Button variant="link" size="sm" href={calcHref(row.calcId)}>
          Open in a tab
        </Button>
      )}
      <Button variant="link" size="sm" onClick={onRelink}>
        Relink…
      </Button>
      {link?.state !== 'part-fails' && (
        <Button variant="link" size="sm" onClick={onMakeDimension}>
          Make it a dimension
        </Button>
      )}
    </>
  )
}

function LinkedDetails(props: LinkedRowViewProps & { partName: string }) {
  const { row, link, system, partName, onRelink, onMakeDimension, onRemove } = props
  const stack = link?.stack ?? row.last.stack
  const broken = link ? isBroken(link.state) : false
  const rows = link?.part?.contributors.length
  return (
    <div className={styles.detailsBody}>
      <DetailRow label="Worst case">
        <div className={styles.pairLine}>
          <span className={styles.mono}>{partResultText(system, stack)}</span>
          <span className={styles.mono}>{range(system, stack.nominal + stack.lowerDeviation, stack.nominal + stack.upperDeviation)}</span>
        </div>
      </DetailRow>
      <DetailRow label="RSS">
        <div className={styles.pairLine}>
          <span className={styles.mono}>σ {sigma(system, stack.sigma)}</span>
          <span className={styles.mono}>
            ±3σ {len(system, 3 * stack.sigma)} · mean {len(system, stack.mean)}
          </span>
        </div>
      </DetailRow>
      <DetailRow label="From">
        <div className={styles.pairLine}>
          <span>{link?.calculationName ?? row.last.calculationName}</span>
          <span className={styles.muted}>
            {link?.folderName ?? row.last.folderName} · saved {savedText(link?.updatedAt ?? row.last.updatedAt)}
          </span>
        </div>
      </DetailRow>
      {!broken && (
        <p className={styles.muted}>
          It updates when the {partName} stack is saved again.
          {rows !== undefined && ` Its ${rows} ${rows === 1 ? 'contributor and its share are' : 'contributors and their shares are'} under Show details on Results.`}
        </p>
      )}
      <div className={styles.rowActions}>
        {link?.state !== 'missing' && (
          <Button variant="secondary" size="sm" icon="open" href={calcHref(row.calcId)}>
            Open in a tab
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={onRelink}>
          {broken ? 'Relink…' : 'Change link…'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onMakeDimension}>
          Make it a dimension
        </Button>
        <Button variant="link" size="sm" className={styles.removeButton} onClick={onRemove}>
          Remove
        </Button>
      </div>
    </div>
  )
}
