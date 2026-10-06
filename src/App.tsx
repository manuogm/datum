// Root component: viewer settings around the screen chosen by the hash route.
// Home is in the main chunk; each tool, Projects and Materials load on first
// visit as their own chunk, under the app header while they load.
import { lazy, Suspense } from 'react'
import { AppLayout } from './app/AppLayout'
import { HomePage } from './app/home/HomePage'
import { PlaceholderPage } from './app/pages/PlaceholderPage'
import { placeholderFor } from './app/pages/placeholders'
import { sectionOf, type Route } from './app/router/routes'
import { useRoute } from './app/router/useRoute'
import { SettingsProvider } from './app/settings/SettingsProvider'
import { LoadingState } from './app/ui'

// One loader per chunk: a module's screens share it, so it loads once.
const loadFit = () => import('./tools/fits/ui')
const loadBolt = () => import('./tools/bolted/ui')
const loadProjects = () => import('./app/projects/screens')
const loadMaterials = () => import('./app/materials/MaterialsPage')

const FitTolerancePage = lazy(() => loadFit().then((m) => ({ default: m.FitTolerancePage })))
const FitReportPage = lazy(() => loadFit().then((m) => ({ default: m.FitReportPage })))
const BoltedJointPage = lazy(() => loadBolt().then((m) => ({ default: m.BoltedJointPage })))
const BoltReportPage = lazy(() => loadBolt().then((m) => ({ default: m.BoltReportPage })))
const ProjectsPage = lazy(() => loadProjects().then((m) => ({ default: m.ProjectsPage })))
const ProjectDetailPage = lazy(() => loadProjects().then((m) => ({ default: m.ProjectDetailPage })))
const MaterialsPage = lazy(() => loadMaterials().then((m) => ({ default: m.MaterialsPage })))

function Screen({ route }: { route: Route }) {
  if (route.name === 'home') return <HomePage />
  if (route.name === 'projects') return <ProjectsPage />
  if (route.name === 'project') return <ProjectDetailPage id={route.id} />
  if (route.name === 'mat') return <MaterialsPage />
  if (route.name === 'fit') return <FitTolerancePage />
  if (route.name === 'fitReport') return <FitReportPage />
  if (route.name === 'bolt') return <BoltedJointPage />
  if (route.name === 'boltReport') return <BoltReportPage />
  return <PlaceholderPage {...placeholderFor(route)} />
}

/** While a screen loads: reports show the note alone, other screens under the header. */
function Loading({ route }: { route: Route }) {
  const note = <LoadingState label="Loading…" />
  if (route.name === 'fitReport' || route.name === 'boltReport') return note
  return <AppLayout section={sectionOf(route)}>{note}</AppLayout>
}

function Routed() {
  const route = useRoute()
  return (
    <Suspense fallback={<Loading route={route} />}>
      <Screen route={route} />
    </Suspense>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      <Routed />
    </SettingsProvider>
  )
}
