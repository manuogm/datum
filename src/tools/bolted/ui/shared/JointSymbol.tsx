// The plan symbol of a joint type, as in the Bolt Pattern design: a
// through-bolt is a ring with a centre dot, a tapped joint a plain ring, a
// Helicoil an inner ring in a dashed outer ring, a Keensert an inner ring in
// a solid one. The ring takes the colour of the enclosing tone class.
import { cx } from '../../../../app/ui'
import type { JointSymbolKind } from '../logic/labels'
import styles from './diagram.module.css'

interface JointSymbolProps {
  kind: JointSymbolKind
  cx: number
  cy: number
  radius: number
}

export function JointSymbol({ kind, cx: x, cy: y, radius }: JointSymbolProps) {
  const inner = radius * 0.5
  return (
    <>
      <circle className={styles.boltRing} cx={x} cy={y} r={radius} />
      {kind === 'through-bolt' && <circle className={styles.boltDot} cx={x} cy={y} r={radius * 0.18} />}
      {(kind === 'helical-coil' || kind === 'key-locking') && (
        <>
          <circle className={cx(styles.boltMark, kind === 'helical-coil' && styles.dashed)} cx={x} cy={y} r={radius * 0.72} />
          <circle className={styles.boltMark} cx={x} cy={y} r={inner} />
        </>
      )}
      {kind === 'tapped' && <circle className={styles.boltMark} cx={x} cy={y} r={inner} />}
    </>
  )
}

/** The symbol on its own, for lists and legends. */
export function JointSymbolIcon({ kind }: { kind: JointSymbolKind }) {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <JointSymbol kind={kind} cx={12} cy={12} radius={10} />
    </svg>
  )
}
