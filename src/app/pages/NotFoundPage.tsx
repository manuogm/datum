// NotFoundPage: what an address with nothing behind it shows (an unknown
// route, a project code this browser does not hold), in the flush-column
// language: the title on top, a hatched stage with the way back.
import styles from './NotFoundPage.module.css'
import { AppLayout } from '../AppLayout'
import { routeHref, type Section } from '../router/routes'
import { Badge, Button, ColumnRow, PageTitle } from '../ui'

interface NotFoundPageProps {
  /** The header tab to keep selected, if any. */
  section: Section | null
  eyebrow: string
  title: string
  message: string
}

export function NotFoundPage({ section, eyebrow, title, message }: NotFoundPageProps) {
  return (
    <AppLayout section={section}>
      <div className={styles.head}>
        <PageTitle eyebrow={eyebrow} title={title}>
          <Badge tone="bad" size="md">
            Not found
          </Badge>
        </PageTitle>
      </div>
      <ColumnRow>
        <div className={styles.stage}>
          <p className={styles.message}>{message}</p>
          <div className={styles.actions}>
            <Button variant="primary" href={routeHref({ name: 'home' })}>
              Back to Home
            </Button>
            <Button href={routeHref({ name: 'projects' })}>Open projects</Button>
          </div>
        </div>
      </ColumnRow>
    </AppLayout>
  )
}
