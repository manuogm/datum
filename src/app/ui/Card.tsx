// Card: bordered container for a list item. Becomes a link when given href.
import type { ReactNode } from 'react'
import styles from './Card.module.css'
import { cx } from './cx'

interface CardProps {
  children: ReactNode
  /** Fill: sunken (on page bg), surface, raised (current item) or plain. */
  variant?: 'sunken' | 'surface' | 'raised' | 'plain'
  /** Accent-tinted border for the current item. */
  highlight?: boolean
  /** sm 12/14, md 16/18, lg 14 all round. */
  padding?: 'sm' | 'md' | 'lg'
  href?: string
  /** Element for a non-link card; article for self-contained entries. */
  as?: 'div' | 'article'
  /** Id of the card's heading, naming an article card. */
  labelledBy?: string
}

export function Card({
  children,
  variant = 'sunken',
  highlight = false,
  padding = 'md',
  href,
  as: Tag = 'div',
  labelledBy,
}: CardProps) {
  const classes = cx(styles.card, styles[variant], styles[padding], highlight && styles.highlight)
  return href ? (
    <a className={classes} href={href}>
      {children}
    </a>
  ) : (
    <Tag className={classes} aria-labelledby={labelledBy}>
      {children}
    </Tag>
  )
}
