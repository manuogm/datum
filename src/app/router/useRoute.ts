// Subscribes to the URL hash and returns the current parsed route. An address
// that names no screen shows Home, and the address bar is corrected to match.
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { HOME, parseHash, routeHref, type Route } from './routes'

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

function getHash(): string {
  return window.location.hash
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash)
  const parsed = useMemo(() => parseHash(hash), [hash])
  useEffect(() => {
    if (parsed === null) window.history.replaceState(null, '', routeHref(HOME))
  }, [parsed])
  return parsed ?? HOME
}
