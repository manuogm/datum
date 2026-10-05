// MonoLabel: 10.5px mono uppercase section label ("APPLICATION",
// "RECENT PROJECTS"), plus the 11px and 10px variants used for page eyebrows
// and dense table headers.
import type { ReactNode } from 'react'
import styles from './MonoLabel.module.css'
import { cx } from './cx'

interface MonoLabelProps {
  children: ReactNode
  /** sm = 10.5px section label, md = 11px eyebrow, xs = 10px table header. */
  size?: 'xs' | 'sm' | 'md'
  tone?: 'muted' | 'faint' | 'accent'
  as?: 'span' | 'div' | 'h2' | 'h3' | 'label'
  htmlFor?: string
  id?: string
  className?: string
}

export function MonoLabel({
  children,
  size = 'sm',
  tone = 'muted',
  as: Tag = 'span',
  htmlFor,
  id,
  className,
}: MonoLabelProps) {
  return (
    <Tag className={cx(styles.label, styles[size], styles[tone], className)} htmlFor={htmlFor} id={id}>
      {children}
    </Tag>
  )
}
