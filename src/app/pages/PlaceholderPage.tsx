// PlaceholderPage: a tidy stand-in for screens that are not built yet, in the
// same flush-column language: planned scope on the left, a hatched stage with
// the tool's schematic on the right.
import styles from './PlaceholderPage.module.css'
import { AppLayout } from '../AppLayout'
import { ToolIllustration } from '../home/ToolIllustration'
import { routeHref } from '../router/routes'
import { Badge, Button, Column, ColumnHeader, ColumnRow, Marker, PageTitle, PanelSection } from '../ui'
import type { PlaceholderContent } from './placeholders'

const STATUS_BADGE = {
  next: { tone: 'accent', text: 'Coming next' },
  missing: { tone: 'bad', text: 'Not found' },
} as const

export function PlaceholderPage({ section, eyebrow, title, status, message, scope, tool }: PlaceholderContent) {
  const badge = STATUS_BADGE[status]
  return (
    <AppLayout section={section}>
      <div className={styles.head}>
        <PageTitle eyebrow={eyebrow} title={title}>
          <Badge tone={badge.tone} size="md">
            {badge.text}
          </Badge>
        </PageTitle>
      </div>
      <ColumnRow>
        {scope.length > 0 && (
          <Column width="inputs" header={<ColumnHeader title="Planned scope" />}>
            <PanelSection label="What it will do">
              <ul className={styles.scope}>
                {scope.map((item) => (
                  <li key={item} className={styles.scopeItem}>
                    <Marker shape="square" color="faint" />
                    {item}
                  </li>
                ))}
              </ul>
            </PanelSection>
          </Column>
        )}
        <div className={styles.stage}>
          {tool && <ToolIllustration tool={tool} width={320} />}
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
