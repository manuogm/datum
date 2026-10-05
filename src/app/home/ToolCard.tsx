// ToolCard: a whole-card link to one tool, with its schematic, description
// and the last calculation made with it.
import styles from './ToolCard.module.css'
import { routeHref } from '../router/routes'
import { cx, MonoLabel } from '../ui'
import { ToolIllustration } from './ToolIllustration'
import type { ToolCardContent } from './toolCards'

interface ToolCardProps {
  content: ToolCardContent
  featured?: boolean
}

export function ToolCard({ content, featured = false }: ToolCardProps) {
  const { tool, index, tag, title, description, footnote } = content
  return (
    <a className={cx(styles.card, featured && styles.featured)} href={routeHref({ name: tool })}>
      <div className={styles.head}>
        <MonoLabel size="md" tone="accent">
          {index}
        </MonoLabel>
        <MonoLabel size="md">{tag}</MonoLabel>
      </div>
      <div className={styles.figure}>
        <ToolIllustration tool={tool} />
      </div>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{description}</p>
      <div className={styles.foot}>
        <span className={styles.footnote}>{footnote}</span>
        <span className={styles.open}>Open →</span>
      </div>
    </a>
  )
}
