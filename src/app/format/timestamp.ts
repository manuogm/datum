// Timestamps of saved work. The library stores local wall-clock time without
// a zone ("2026-10-05T14:32:00"): it reads back as it was written, and it
// sorts correctly as plain text.

const pad = (n: number) => String(n).padStart(2, '0')

export function localTimestamp(date: Date = new Date()): string {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
