// The plies from the top down, one row each: material and fibre angle (each
// ply has its material's cured thickness). A row is dragged by its handle to
// re-stack the laminate (or moved with the arrow keys on the handle); the ply
// chosen here is the one highlighted in the ply stack beside it.
import { useState, type DragEvent } from 'react'
import { CloseButton, cx, InputWell, NumberInput, Select } from '../../../../app/ui'
import { PLY_MATERIALS } from '../../calc'
import type { PlySpec } from '../state/lamInputs'
import styles from './editor.module.css'

/** 'T700/M21 UD': the fibre names carbon or glass, so the narrow rows leave out CFRP/GFRP. */
const MATERIALS = PLY_MATERIALS.map((m) => ({ value: m.id, label: m.name.replace(/^[CG]FRP /, '') }))

interface PlyListProps {
  plies: readonly PlySpec[]
  selectedPly: number | null
  onSelect: (index: number) => void
  onChange: (index: number, changes: Partial<PlySpec>) => void
  onMove: (from: number, to: number) => void
  onRemove: (index: number) => void
}

export function PlyList({ plies, selectedPly, onSelect, onChange, onMove, onRemove }: PlyListProps) {
  const [dragged, setDragged] = useState<number | null>(null)
  const [target, setTarget] = useState<number | null>(null)
  const endDrag = () => {
    setDragged(null)
    setTarget(null)
  }
  const over = (i: number) => (event: DragEvent) => {
    if (dragged === null) return
    event.preventDefault()
    setTarget(i)
  }
  const drop = (i: number) => (event: DragEvent) => {
    event.preventDefault()
    if (dragged !== null) onMove(dragged, i)
    endDrag()
  }
  return (
    <ol className={styles.plies} aria-label="Plies, top to bottom">
      {plies.map((ply, i) => {
        const index = i + 1
        return (
          <li
            key={i}
            className={cx(
              styles.ply,
              i % 2 === 1 && styles.plyAlt,
              selectedPly === index && styles.plySelected,
              dragged === i && styles.plyDragged,
              target === i && dragged !== null && dragged !== i && (dragged < i ? styles.dropBelow : styles.dropAbove),
            )}
            onClick={() => onSelect(index)}
            onDragOver={over(i)}
            onDrop={drop(i)}
          >
            <button
              type="button"
              className={styles.handle}
              draggable
              aria-label={`Move ply ${index}: drag, or use the arrow keys`}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move'
                setDragged(i)
              }}
              onDragEnd={endDrag}
              onKeyDown={(event) => {
                const to = event.key === 'ArrowUp' ? i - 1 : event.key === 'ArrowDown' ? i + 1 : null
                if (to === null || to < 0 || to >= plies.length) return
                event.preventDefault()
                onMove(i, to)
                onSelect(to + 1)
              }}
            >
              <span aria-hidden="true">⠿</span>
            </button>
            <span className={styles.plyNumber}>{index}</span>
            <Select size="sm" aria-label={`Ply ${index} material`} options={MATERIALS} value={ply.materialId} onChange={(materialId) => onChange(i, { materialId })} />
            <InputWell unit="°">
              <NumberInput label={`Ply ${index} angle`} decimals={1} fixed={false} value={ply.angleDeg} onChange={(angleDeg) => onChange(i, { angleDeg })} />
            </InputWell>
            {plies.length > 1 ? <CloseButton label={`Remove ply ${index}`} onClick={() => onRemove(i)} /> : <span />}
          </li>
        )
      })}
    </ol>
  )
}
