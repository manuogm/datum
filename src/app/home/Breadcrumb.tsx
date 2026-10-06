// Breadcrumb: the way down from Home to the folder shown; every step but the
// last links back up.
import { Fragment } from 'react'
import type { Folder } from '../../core/library'
import { folderHref } from '../router/routes'
import styles from './Breadcrumb.module.css'

export function Breadcrumb({ path }: { path: readonly Folder[] }) {
  const steps = [{ id: null, name: 'Home' }, ...path]
  return (
    <nav aria-label="Folder path" className={styles.breadcrumb}>
      {steps.map((step, i) => (
        <Fragment key={step.id ?? 'home'}>
          {i > 0 && <span className={styles.separator}>/</span>}
          {i < steps.length - 1 ? (
            <a className={styles.step} href={folderHref(step.id)}>
              {step.name}
            </a>
          ) : (
            <span className={styles.current} aria-current="page">
              {step.name}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  )
}
