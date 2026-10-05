// An SVG force arrow from tail to tip, in the colour of the enclosing group
// (see .axial, .shear in diagram.module.css).
import type { Segment } from '../../../../app/charts'
import styles from './diagram.module.css'

const HEAD_LENGTH = 7
const HEAD_HALF_WIDTH = 3.5

export function Arrow({ segment }: { segment: Segment }) {
  const { x1, y1, x2, y2 } = segment
  const length = Math.hypot(x2 - x1, y2 - y1) || 1
  const [ux, uy] = [(x2 - x1) / length, (y2 - y1) / length]
  const [bx, by] = [x2 - ux * HEAD_LENGTH, y2 - uy * HEAD_LENGTH]
  const head = [[x2, y2], [bx - uy * HEAD_HALF_WIDTH, by + ux * HEAD_HALF_WIDTH], [bx + uy * HEAD_HALF_WIDTH, by - ux * HEAD_HALF_WIDTH]]
  return (
    <>
      <line className={styles.arrow} x1={x1} y1={y1} x2={bx} y2={by} />
      <polygon className={styles.arrowHead} points={head.map((p) => p.join(',')).join(' ')} />
    </>
  )
}
