// In-memory values that outlive a component while the page is open, e.g.
// which result depths a tool has opened or the step it was on, so closing
// and reopening a calculation tab finds it as it was left. Nothing is
// written to storage: a reload starts fresh.
import { useCallback, useState } from 'react'

const memory = new Map<string, unknown>()

export function recall<T>(key: string, fallback: T): T {
  return memory.has(key) ? (memory.get(key) as T) : fallback
}

export function remember<T>(key: string, value: T): void {
  memory.set(key, value)
}

/** Forget every key that starts with `prefix` (e.g. a deleted calculation's id). */
export function forget(prefix: string): void {
  for (const key of [...memory.keys()]) if (key.startsWith(prefix)) memory.delete(key)
}

/**
 * useState that also remembers its value under `key` for the rest of the
 * page's life. Without a key it is plain useState.
 */
export function useSessionState<T>(key: string | undefined, initial: T): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => (key === undefined ? initial : recall(key, initial)))
  const set = useCallback(
    (next: T) => {
      if (key !== undefined) remember(key, next)
      setValue(next)
    },
    [key],
  )
  return [value, set]
}
