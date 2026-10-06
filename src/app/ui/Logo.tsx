// Datum logo mark and wordmark; links home when given an href.
import styles from './Logo.module.css'
import { cx } from './cx'

interface LogoProps {
  size?: 'md' | 'sm'
  href?: string
  /** Show only the mark on a phone, so the header's tabs keep their room. */
  markOnPhone?: boolean
}

export function Logo({ size = 'md', href, markOnPhone = false }: LogoProps) {
  const className = cx(styles.logo, size === 'sm' && styles.small, markOnPhone && styles.markOnPhone)
  const content = (
    <>
      <span className={styles.mark} aria-hidden="true" />
      <span className={styles.word}>Datum</span>
    </>
  )
  return href ? (
    <a className={className} href={href} aria-label="Datum home">
      {content}
    </a>
  ) : (
    <span className={className}>{content}</span>
  )
}
