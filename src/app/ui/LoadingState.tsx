// LoadingState: the quiet note shown while a screen's code loads, in the
// style of a section label. It fades in only after a short delay, so a fast
// load shows nothing at all.
import styles from './LoadingState.module.css'
import { MonoLabel } from './MonoLabel'

export function LoadingState({ label }: { label: string }) {
  return (
    <div className={styles.loading} role="status">
      <MonoLabel tone="faint">{label}</MonoLabel>
    </div>
  )
}
