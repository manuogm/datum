// Root component: viewer settings around the screen chosen by the hash route.
// Home is in the main chunk; each tool, Projects and Materials load on first
// visit as their own chunk, under the app header while they load.
import { lazy, Suspense } from 'react'
import { AppLayout } from './app/AppLayout'
import { HomePage } from './app/home/HomePage'
import { NotFoundPage } from './app/pages/NotFoundPage'
import { sectionOf, type Route } from './app/router/routes'
import { useRoute } from './app/router/useRoute'
import { SettingsProvider } from './app/settings/SettingsProvider'
import { LoadingState } from './app/ui'

// One loader per chunk: a module's screens share it, so it loads once.
const loadFit = () => import('./tools/fits/ui')
const loadBolt = () => import('./tools/bolted/ui')
const loadLaminate = () => import('./tools/laminate/ui')
const loadProjects = () => import('./app/projects/screens')
const loadMaterials = () => import('./app/materials/MaterialsPage')

const FitTolerancePage = lazy(() => loadFit().then((m) => ({ default: m.FitTolerancePage })))
const FitReportPage = lazy(() => loadFit().then((m) => ({ default: m.FitReportPage })))
const BoltedJointPage = lazy(() => loadBolt().then((m) => ({ default: m.BoltedJointPage })))
const BoltReportPage = lazy(() => loadBolt().then((m) => ({ default: m.BoltReportPage })))
const LaminatePage = lazy(() => loadLaminate().then((m) => ({ default: m.LaminatePage })))
const LaminateReportPage = lazy(() => loadLaminate().then((m) => ({ default: m.LaminateReportPage })))
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
  if (route.name === 'lam') return <LaminatePage />
  if (route.name === 'lamReport') return <LaminateReportPage />
  return (
    <NotFoundPage
      section={null}
      eyebrow={`#/${route.path}`}
      title="Page not found"
      message="There is no screen at this address. Pick a tool from the tabs above or go back to Home."
    />
  )
}

/** While a screen loads: reports show the note alone, other screens under the header. */
function Loading({ route }: { route: Route }) {
  const note = <LoadingState label="Loading…" />
  if (route.name === 'fitReport' || route.name === 'boltReport' || route.name === 'lamReport') return note
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
