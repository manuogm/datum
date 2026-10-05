// Timestamps of saved work. Projects store local wall-clock time without a
// zone ("2026-10-05T14:32:00"): the team reads them as they were written,
// and they sort correctly as plain text.
import { formatActivityTime } from './formatActivityTime'

const pad = (n: number) => String(n).padStart(2, '0')

export function localTimestamp(date: Date = new Date()): string {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** Day and time as stacked in the project history: { day: "Today", time: "14:32" }, { day: "4 Oct", … }. */
export function formatDayAndTime(timestamp: string, now?: Date): { day: string; time: string } {
  const when = new Date(timestamp)
  const time = `${pad(when.getHours())}:${pad(when.getMinutes())}`
  const activity = formatActivityTime(when, now)
  if (activity.endsWith('today')) return { day: 'Today', time }
  return { day: activity === 'yesterday' ? 'Yesterday' : activity, time }
}
