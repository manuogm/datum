// Small schematic of each tool, drawn on its card in the New calculation
// dialog: tolerance zones, a bolt pattern, a ply stack and a stack-up loop.
import type { ComponentType } from 'react'
import styles from './ToolIllustration.module.css'
import { cx } from '../ui'
import type { ToolId } from '../../core/library'

function FitDiagram() {
  return (
    <>
      <line x1="0" x2="300" y1="86" y2="86" className={styles.strokeText} strokeWidth="1.5" />
      <rect x="70" y="26" width="70" height="60" className={cx(styles.fillHoleSoft, styles.strokeHole)} strokeWidth="1.5" />
      <rect x="160" y="102" width="70" height="38" className={cx(styles.fillShaftSoft, styles.strokeAccent)} strokeWidth="1.5" />
      <text x="105" y="62" className={cx(styles.zoneLabel, styles.holeLabel)}>
        H7
      </text>
      <text x="195" y="127" className={cx(styles.zoneLabel, styles.shaftLabel)}>
        g6
      </text>
      <line x1="262" x2="262" y1="28" y2="138" className={styles.strokeOk} strokeWidth="1.5" />
    </>
  )
}

function BoltDiagram() {
  const bolt = cx(styles.fillSurface, styles.strokeText)
  return (
    <>
      <rect x="40" y="25" width="220" height="120" rx="18" className={styles.strokeFaint} strokeWidth="1.2" />
      <circle cx="80" cy="55" r="10" className={bolt} strokeWidth="1.5" />
      <circle cx="220" cy="55" r="10" className={bolt} strokeWidth="1.5" />
      <circle cx="80" cy="115" r="6" className={cx(styles.fillSurface, styles.strokeWarn)} strokeWidth="1.5" />
      <circle cx="220" cy="115" r="6" className={cx(styles.fillSurface, styles.strokeBad)} strokeWidth="2" />
      <circle cx="150" cy="40" r="7" className={bolt} strokeWidth="1.5" />
      <circle cx="150" cy="130" r="7" className={bolt} strokeWidth="1.5" />
      <line x1="145" x2="155" y1="85" y2="85" className={styles.strokeMuted} strokeWidth="1" />
      <line x1="150" x2="150" y1="80" y2="90" className={styles.strokeMuted} strokeWidth="1" />
      <line x1="220" x2="232" y1="115" y2="88" className={styles.strokeAccent} strokeWidth="1.5" />
    </>
  )
}

function LaminateDiagram() {
  const ply = cx(styles.fillSurface, styles.strokeText)
  return (
    <>
      <polygon points="150,14 250,42 150,70 50,42" className={ply} strokeWidth="1.2" />
      <polygon points="150,48 250,76 150,104 50,76" className={ply} strokeWidth="1.2" />
      <polygon points="150,82 250,110 150,138 50,110" className={cx(styles.fillShaftSoft, styles.strokeAccent)} strokeWidth="1.2" />
      <line x1="100" x2="200" y1="28" y2="56" className={styles.strokeFaint} strokeWidth="1" />
      <line x1="100" x2="200" y1="90" y2="62" className={styles.strokeFaint} strokeWidth="1" />
      <line x1="150" x2="150" y1="82" y2="138" className={styles.strokeAccent} strokeWidth="1" />
    </>
  )
}

/** Three chained dimensions (+, −, +) from a start line, and the result they add up to inside its required window. */
function StackDiagram() {
  const arrow = (y: number, from: number, to: number) => {
    const dir = Math.sign(to - from)
    return (
      <g key={y}>
        <line x1={from} x2={to - dir * 8} y1={y} y2={y} className={styles.strokeText} strokeWidth="1.5" />
        <line x1={from} x2={from} y1={y - 6} y2={y + 6} className={styles.strokeText} strokeWidth="1.5" />
        <polygon points={`${to},${y} ${to - dir * 10},${y - 5} ${to - dir * 10},${y + 5}`} className={styles.fillText} />
      </g>
    )
  }
  return (
    <>
      <line x1="40" x2="40" y1="14" y2="150" className={styles.strokeFaint} strokeWidth="1.2" strokeDasharray="4 4" />
      <line x1="170" x2="170" y1="84" y2="150" className={styles.strokeFaint} strokeWidth="1.2" strokeDasharray="4 4" />
      {arrow(30, 40, 240)}
      {arrow(58, 240, 110)}
      {arrow(86, 110, 170)}
      <rect x="62" y="110" width="186" height="40" className={cx(styles.fillOkWash, styles.strokeOk)} strokeWidth="1.2" strokeDasharray="5 4" />
      <rect x="92" y="120" width="128" height="20" className={cx(styles.fillSurface, styles.strokeText)} strokeWidth="1.5" />
      <rect x="128" y="126" width="56" height="8" className={styles.fillOk} />
    </>
  )
}

const DIAGRAMS: Record<ToolId, ComponentType> = {
  fit: FitDiagram,
  bolt: BoltDiagram,
  lam: LaminateDiagram,
  stack: StackDiagram,
}

export function ToolIllustration({ tool, width = 240 }: { tool: ToolId; width?: number }) {
  const Diagram = DIAGRAMS[tool]
  return (
    <svg className={styles.svg} width={width} height={(width * 140) / 240} viewBox="0 0 300 170" aria-hidden="true">
      <Diagram />
    </svg>
  )
}
