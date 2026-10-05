// Root component: viewer settings around the screen chosen by the hash route.
import { HomePage } from './app/home/HomePage'
import { HOME_FIXTURE } from './app/home/home.fixtures'
import { PlaceholderPage } from './app/pages/PlaceholderPage'
import { placeholderFor } from './app/pages/placeholders'
import { useRoute } from './app/router/useRoute'
import { SettingsProvider } from './app/settings/SettingsProvider'

function Screen() {
  const route = useRoute()
  if (route.name === 'home') return <HomePage data={HOME_FIXTURE} />
  return <PlaceholderPage {...placeholderFor(route)} />
}

export default function App() {
  return (
    <SettingsProvider>
      <Screen />
    </SettingsProvider>
  )
}
