// Header tabs, in display order.
import { routeHref, type Section } from './router/routes'
import type { TabItem } from './ui'

const SECTIONS: readonly { section: Section; label: string }[] = [
  { section: 'home', label: 'Home' },
  { section: 'projects', label: 'Projects' },
  { section: 'fit', label: 'Fit Tolerance' },
  { section: 'bolt', label: 'Bolted Joint' },
  { section: 'lam', label: 'Laminate' },
  { section: 'mat', label: 'Materials' },
]

export const NAV_ITEMS: readonly TabItem[] = SECTIONS.map(({ section, label }) => ({
  key: section,
  label,
  href: routeHref({ name: section }),
}))
