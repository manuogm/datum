// NotFoundPage: what an address with nothing behind it shows (a calculation
// or folder deleted here or in another browser tab, or an old link), in the
// flush-column language: the title on top, a hatched stage with the way back.
import styles from './NotFoundPage.module.css'
import { AppLayout } from '../AppLayout'
import { folderHref } from '../router/routes'
import { Badge, Button, ColumnRow, PageTitle } from '../ui'

interface NotFoundPageProps {
  eyebrow: string
  title: string
  message: string
}

export function NotFoundPage({ eyebrow, title, message }: NotFoundPageProps) {
  return (
    <AppLayout current={null}>
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
            <Button variant="primary" href={folderHref(null)}>
              Back to Home
            </Button>
          </div>
        </div>
      </ColumnRow>
    </AppLayout>
  )
}
