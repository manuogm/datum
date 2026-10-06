// Warnings about the materials themselves (a housing or shaft used above its
// service limit), as a callout under the verdict of either mode.
import { Callout } from '../../../../app/ui'

export function MaterialNotes({ notes }: { notes: readonly string[] }) {
  if (notes.length === 0) return null
  return (
    <Callout status="warn" title={notes.length === 1 ? 'Material service limit' : 'Material service limits'}>
      {notes.join(' ')}
    </Callout>
  )
}
