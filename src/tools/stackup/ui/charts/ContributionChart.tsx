// Which rows the result's variation comes from (design §5.3): each row's
// share of the worst-case band or of the RSS variance, largest first, in one
// neutral hue (colour follows the row, never the rank). In an assembly a
// linked part opens to its own rows, with their share of the assembly: the
// part's share × the row's share within the part. That answers "which part,
// and which feature of it".
import { useState, type ReactNode } from 'react'
import { Icon, MonoLabel, SegmentedControl, useSessionState, type IconName } from '../../../../app/ui'
import type { UnitSystem } from '../../../../core/units'
import type { StackAnalysis, StackMethod } from '../../calc'
import { rowLabel } from '../logic/engineInput'
import { percent, plusMinus } from '../logic/format'
import type { ResolvedLink } from '../logic/links'
import { byShare, sharesByMethod } from '../logic/verdict'
import { gdtIcon } from '../gdt/characteristics'
import type { StackInputs, StackRow } from '../state/stackInputs'
import styles from './charts.module.css'

interface ContributionChartProps {
  inputs: StackInputs
  analysis: StackAnalysis
  links: ReadonlyMap<string, ResolvedLink>
  system: UnitSystem
  /** Remembers the method switch, e.g. `stack:<calcId>/shares`. */
  memoryKey?: string
}

const METHODS = [
  { value: 'worst-case', label: 'Worst case' },
  { value: 'rss', label: 'RSS' },
] as const

const iconOf = (row: StackRow | undefined): IconName | null =>
  row?.kind === 'linked' ? 'link' : row?.kind === 'datum-shift' ? 'datum-shift' : row?.tolerance.kind === 'geometric' ? gdtIcon(row.tolerance.characteristic) : null

export function ContributionChart({ inputs, analysis, links, system, memoryKey }: ContributionChartProps) {
  const [method, setMethod] = useSessionState<StackMethod>(memoryKey, analysis.method)
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())
  const shares = sharesByMethod(analysis, method)
  const toggle = (id: string) => {
    const next = new Set(open)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setOpen(next)
  }
  return (
    <section className={styles.contributions} aria-label="Contributions">
      <div className={styles.contributionsHead}>
        <MonoLabel>Contributions · {method === 'worst-case' ? 'share of the worst case' : 'share of the RSS variance'}</MonoLabel>
        <SegmentedControl label="Share by" size="sm" options={METHODS} value={method} onChange={setMethod} />
      </div>
      <ol className={styles.shareList}>
        {byShare(shares).map((i) => {
          const row = analysis.contributors[i]
          const input = inputs.rows[i]
          const link = input?.kind === 'linked' ? links.get(input.id) : undefined
          const part = link?.part ?? null
          const id = input?.id ?? String(i)
          const label = link ? `${link.partName || link.calculationName} stack` : input?.kind === 'dimension' ? rowLabel(input, i) : row.label
          const expanded = part !== null && open.has(id)
          return (
            <li key={id}>
              <ShareRow
                number={
                  <>
                    {part && (
                      <button type="button" className={styles.drill} aria-expanded={expanded} aria-label={`${expanded ? 'Hide' : 'Show'} the rows of the ${label}`} onClick={() => toggle(id)}>
                        <Icon name="chevron-right" size={12} />
                      </button>
                    )}
                    #{i + 1}
                  </>
                }
                icon={iconOf(input)}
                label={label}
                share={shares[i]}
                band={plusMinus(system, Math.abs(row.sensitivity) * row.halfBand)}
              />
              {expanded && part && (
                <ol className={styles.shareList} aria-label={`Rows of the ${label}`}>
                  {sharesByMethod(part, method).map((inPart, j) => {
                    const partRow = part.contributors[j]
                    const partInput = link?.partInputs?.rows[j]
                    return (
                      <li key={j}>
                        <ShareRow
                          sub
                          number={`${i + 1}.${j + 1}`}
                          icon={iconOf(partInput)}
                          label={partInput?.kind === 'dimension' ? rowLabel(partInput, j) : partRow.label}
                          share={(shares[i] * inPart) / 100}
                          band={plusMinus(system, Math.abs(row.sensitivity * partRow.sensitivity) * partRow.halfBand)}
                        />
                      </li>
                    )
                  })}
                </ol>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

interface ShareRowProps {
  number: ReactNode
  icon: IconName | null
  label: string
  share: number
  band: string
  sub?: boolean
}

function ShareRow({ number, icon, label, share, band, sub = false }: ShareRowProps) {
  return (
    <div className={`${styles.shareRow} ${sub ? styles.shareSub : ''}`}>
      <span className={styles.shareNumber}>{number}</span>
      <span className={styles.shareName}>
        {icon && <Icon name={icon} size={13} className={styles.shareIcon} />}
        <span>{label}</span>
      </span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.fill} style={{ width: `${Math.max(0, Math.min(100, share))}%` }} />
      </span>
      <span className={styles.shareBand}>{band}</span>
      <span className={styles.sharePercent}>{percent(share)}</span>
    </div>
  )
}
