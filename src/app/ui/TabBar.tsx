// TabBar: horizontal tabs with the accent underline. Header navigation uses
// links (size "header"); in-page tabs use buttons (size "page").
import type { ReactNode } from 'react'
import styles from './TabBar.module.css'
import { cx } from './cx'

export interface TabItem {
  key: string
  label: ReactNode
  /** Makes the tab a link; otherwise it is a button calling onSelect. */
  href?: string
  count?: number
}

interface TabBarProps {
  items: readonly TabItem[]
  activeKey: string | null
  onSelect?: (key: string) => void
  /** Accessible name of the navigation. */
  label: string
  size?: 'header' | 'page'
  className?: string
}

export function TabBar({ items, activeKey, onSelect, label, size = 'page', className }: TabBarProps) {
  return (
    <nav className={cx(styles.bar, styles[size], className)} aria-label={label}>
      {items.map((item) => {
        const active = item.key === activeKey
        const classes = cx(styles.tab, active && styles.active)
        const content = (
          <>
            {item.label}
            {item.count !== undefined && <span className={styles.count}>{item.count}</span>}
          </>
        )
        return item.href ? (
          <a key={item.key} className={classes} href={item.href} aria-current={active ? 'page' : undefined}>
            {content}
          </a>
        ) : (
          <button
            key={item.key}
            type="button"
            className={classes}
            aria-pressed={active}
            onClick={() => onSelect?.(item.key)}
          >
            {content}
          </button>
        )
      })}
    </nav>
  )
}
