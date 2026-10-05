// Formats when something last happened, in the compact style of the activity
// lists: "14:32 today", "yesterday", "2 Oct", "2 Oct 2025".

const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function formatActivityTime(when: Date, now: Date = new Date()): string {
  const daysAgo = Math.round((startOfDay(now) - startOfDay(when)) / DAY_MS)
  if (daysAgo === 0) {
    const time = when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    return `${time} today`
  }
  if (daysAgo === 1) return 'yesterday'
  const sameYear = when.getFullYear() === now.getFullYear()
  return when.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
  })
}
