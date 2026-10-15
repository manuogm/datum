// The result strip, the aside of the Method step (design §2.3): the result
// lane of the stack chart alone, drawn larger. The worst-case outline and
// the RSS bar sit against the dashed requirement window; the method the
// verdict uses is in its status colour and the other is neutral, so the
// strip follows the choice.
import { niceAxis, scaleLinear } from '../../../../app/charts'
import { cx } from '../../../../app/ui'
import { formatDecimal } from '../../../../core/units'
import { edgeLabel, type ChartResult } from './stackChart'
import styles from './charts.module.css'
import { useWidth } from './useWidth'

const HEIGHT = 64
const AXIS = 26

export function ResultStrip({ result }: { result: ChartResult }) {
  const [ref, width] = useWidth<HTMLDivElement>(360)
  const { window } = result
  const values = [0, ...result.worstCase, ...result.rss, ...(window ? [window.min, window.max].filter((v): v is number => v !== null) : [])]
  const reach = Math.max(...values.map(Math.abs))
  const axis = niceAxis([-reach, reach], 4)
  const left = 8
  const right = width - 8
  const e = scaleLinear(axis, left, right)
  const y = 34
  const tone = styles[result.tone]
  const wcChosen = result.method === 'worst-case'
  const lo = window?.min == null ? left : e(window.min)
  const hi = window?.max == null ? right : e(window.max)
  const [wcLo, wcHi] = result.worstCase.map(e)
  const [rssLo, rssHi] = result.rss.map(e)
  const decimals = Math.max(0, Math.min(4, -Math.floor(Math.log10(axis.step) + 1e-9))) + 1
  return (
    <div className={styles.strip}>
      <div ref={ref} className={styles.canvas}>
        <svg width={width} height={HEIGHT + AXIS} viewBox={`0 0 ${width} ${HEIGHT + AXIS}`} aria-hidden="true" focusable="false">
          {window && (
            <>
              <rect className={styles.window} x={lo} y={6} width={Math.max(0, hi - lo)} height={HEIGHT - 6} />
              {window.min !== null && <line className={styles.windowEdge} x1={lo} x2={lo} y1={2} y2={HEIGHT} />}
              {window.max !== null && <line className={styles.windowEdge} x1={hi} x2={hi} y1={2} y2={HEIGHT} />}
              {window.min !== null && (
                <text className={styles.windowText} x={lo + 4} y={16}>
                  {result.windowText.min}
                </text>
              )}
              {window.max !== null && (
                <text className={cx(styles.windowText, styles.end)} x={hi - 4} y={16}>
                  {result.windowText.max}
                </text>
              )}
            </>
          )}
          {result.offScale.map((mark) => (
            <text key={mark.side} className={cx(styles.windowText, mark.side === 'upper' && styles.end)} x={mark.side === 'lower' ? left : right} y={16}>
              {mark.text}
            </text>
          ))}
          <line className={styles.zeroLine} x1={e(0)} x2={e(0)} y1={2} y2={HEIGHT} />
          <rect className={cx(styles.wcBand, wcChosen && tone)} x={wcLo} y={y - 14} width={Math.max(1, wcHi - wcLo)} height={28} />
          <rect className={cx(styles.rssBand, !wcChosen && tone)} x={rssLo} y={y - 6} width={Math.max(1, rssHi - rssLo)} height={12} />
          <line className={styles.axisLine} x1={left} x2={right} y1={HEIGHT + 4} y2={HEIGHT + 4} />
          {axis.ticks.map((tick) => {
            const text = tick === 0 ? '0' : formatDecimal(tick, decimals, true, true)
            const label = edgeLabel(e(tick), text, 0, width)
            return (
              <text key={tick} className={styles.tickText} x={label.x} y={HEIGHT + 18} style={{ textAnchor: label.anchor }}>
                {text}
              </text>
            )
          })}
        </svg>
      </div>
      <div className={styles.stripRanges}>
        <span className={cx(wcChosen && tone)}>{result.worstCaseText}</span>
        <span className={cx(!wcChosen && tone)}>{result.rssText}</span>
      </div>
    </div>
  )
}
