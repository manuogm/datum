// MathText: writes formula text with subscripts, so "C_max = D_max − d_min"
// reads Cₘₐₓ = Dₘₐₓ − dₘᵢₙ. An underscore puts the following letters and
// digits in a subscript.
import { Fragment } from 'react'

interface MathTextProps {
  children: string
}

export function MathText({ children }: MathTextProps) {
  // Splitting on a capture group keeps the subscripts at the odd indexes.
  const parts = children.split(/_([A-Za-z0-9]+)/)
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? <sub key={index}>{part}</sub> : <Fragment key={index}>{part}</Fragment>,
      )}
    </>
  )
}
