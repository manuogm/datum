// Safe localStorage access for per-viewer preferences. Storage can be blocked
// (private windows, disabled site data), so every access is guarded.

export function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = window.localStorage.getItem(key)
    return allowed.find((option) => option === value) ?? fallback
  } catch {
    return fallback
  }
}

export function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Preference is kept for this session only.
  }
}
