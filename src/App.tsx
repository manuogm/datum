// Root component: viewer settings around the screen chosen by the hash route.
// Home is in the main chunk; each tool and Materials load on first visit as
// their own chunk, under the top bar while they load.
import { lazy, Suspense, useEffect, type ComponentType } from 'react'
import { findCalculation, findFolder, type Calculation, type ToolId } from './core/library'
import { AppLayout } from './app/AppLayout'
import { HomePage } from './app/home/HomePage'
import { useLibrary } from './app/library/useLibrary'
import { NotFoundPage } from './app/pages/NotFoundPage'
import type { Route } from './app/router/routes'
import { useRoute } from './app/router/useRoute'
import { SettingsProvider } from './app/settings/SettingsProvider'
import { openTab } from './app/shell/openTabs'
import { LoadingState } from './app/ui'

// One loader per chunk: a module's screens share it, so it loads once.
const loadFit = () => import('./tools/fits/ui')
const loadBolt = () => import('./tools/bolted/ui')
const loadLaminate = () => import('./tools/laminate/ui')
const loadMaterials = () => import('./app/materials/MaterialsPage')

type CalculationScreen = ComponentType<{ calculation: Calculation }>

/** Each tool's page and report, by the tool a calculation belongs to. */
const TOOL_SCREENS: Record<ToolId, { page: CalculationScreen; report: CalculationScreen }> = {
  fit: {
    page: lazy(() => loadFit().then((m) => ({ default: m.FitTolerancePage }))),
    report: lazy(() => loadFit().then((m) => ({ default: m.FitReportPage }))),
  },
  bolt: {
    page: lazy(() => loadBolt().then((m) => ({ default: m.BoltedJointPage }))),
    report: lazy(() => loadBolt().then((m) => ({ default: m.BoltReportPage }))),
  },
  lam: {
    page: lazy(() => loadLaminate().then((m) => ({ default: m.LaminatePage }))),
    report: lazy(() => loadLaminate().then((m) => ({ default: m.LaminateReportPage }))),
  },
}
const MaterialsPage = lazy(() => loadMaterials().then((m) => ({ default: m.MaterialsPage })))

const MISSING_CALCULATION = {
  title: 'Calculation not found',
  message: 'This calculation is not in your library: it may have been deleted. Your other calculations are on Home.',
}

function Screen({ route }: { route: Route }) {
  const { library } = useLibrary()
  if (route.name === 'materials') return <MaterialsPage />
  if (route.name === 'home') {
    if (route.folderId !== null && !findFolder(library, route.folderId)) {
      return (
        <NotFoundPage
          eyebrow="Folder"
          title="Folder not found"
          message="This folder is not in your library: it may have been deleted or moved away with its parent."
        />
      )
    }
    return <HomePage folderId={route.folderId} />
  }
  const calculation = findCalculation(library, route.id)
  if (!calculation) return <NotFoundPage eyebrow="Calculation" {...MISSING_CALCULATION} />
  if (route.name === 'report') {
    const Report = TOOL_SCREENS[calculation.tool].report
    return <Report calculation={calculation} />
  }
  return <OpenCalculation calculation={calculation} />
}

/** A calculation open in its tool; showing it opens its tab in the top bar. */
function OpenCalculation({ calculation }: { calculation: Calculation }) {
  const Page = TOOL_SCREENS[calculation.tool].page
  useEffect(() => openTab(calculation.id), [calculation.id])
  // Keyed, so each calculation gets a fresh screen with its own inputs.
  return <Page key={calculation.id} calculation={calculation} />
}

/** While a screen loads: reports show the note alone, other screens under the top bar. */
function Loading({ route }: { route: Route }) {
  const note = <LoadingState label="Loading…" />
  if (route.name === 'report') return note
  if (route.name === 'calc') return <AppLayout current={{ tab: 'calc', id: route.id }}>{note}</AppLayout>
  return <AppLayout current={route.name === 'home' ? { tab: 'home' } : 'materials'}>{note}</AppLayout>
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
