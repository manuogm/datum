// Root component: viewer settings around the screen chosen by the hash route.
import { HomePage } from './app/home/HomePage'
import { MaterialsPage } from './app/materials/MaterialsPage'
import { PlaceholderPage } from './app/pages/PlaceholderPage'
import { placeholderFor } from './app/pages/placeholders'
import { ProjectDetailPage } from './app/projects/detail/ProjectDetailPage'
import { ProjectsPage } from './app/projects/ProjectsPage'
import { useRoute } from './app/router/useRoute'
import { SettingsProvider } from './app/settings/SettingsProvider'
import { FitReportPage, FitTolerancePage } from './tools/fits/ui'

function Screen() {
  const route = useRoute()
  if (route.name === 'home') return <HomePage />
  if (route.name === 'projects') return <ProjectsPage />
  if (route.name === 'project') return <ProjectDetailPage id={route.id} />
  if (route.name === 'mat') return <MaterialsPage />
  if (route.name === 'fit') return <FitTolerancePage />
  if (route.name === 'fitReport') return <FitReportPage />
  return <PlaceholderPage {...placeholderFor(route)} />
}

export default function App() {
  return (
    <SettingsProvider>
      <Screen />
    </SettingsProvider>
  )
}
