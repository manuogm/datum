// Avatar: a person's initials in a filled circle (header user, team lists).
import styles from './Avatar.module.css'
import { cx } from './cx'

interface AvatarProps {
  initials: string
  /** Full name, used as the accessible label. */
  name?: string
  /** xs 20px, sm 26px, md 28px, lg 30px (header). */
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

export function Avatar({ initials, name, size = 'md' }: AvatarProps) {
  return (
    <span className={cx(styles.avatar, styles[size])} role="img" aria-label={name ?? initials}>
      {initials}
    </span>
  )
}
