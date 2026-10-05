// Button: primary (orange), secondary (outline), ghost (Cancel) and link
// ("Open →"). Renders an <a> when given an href, otherwise a <button>.
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Button.module.css'
import { cx } from './cx'
import { Icon, type IconName } from './Icon'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'link'
  /** sm = compact (30px), md = header control (36px), lg = panel action (38px). */
  size?: 'sm' | 'md' | 'lg'
  icon?: IconName
  /** Stretch to fill the remaining width of a flex row. */
  block?: boolean
  href?: string
}

export function Button({
  children,
  variant = 'secondary',
  size = 'lg',
  icon,
  block = false,
  href,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = cx(styles.button, styles[variant], styles[size], block && styles.block, className)
  const content = (
    <>
      {icon && <Icon name={icon} />}
      {children}
    </>
  )
  if (href) {
    return (
      <a className={classes} href={href}>
        {content}
      </a>
    )
  }
  return (
    <button className={classes} type={type} {...rest}>
      {content}
    </button>
  )
}
