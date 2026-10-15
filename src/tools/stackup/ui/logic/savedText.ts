// When a linked part was saved, as the links show it: "14 Oct, 14:02". The
// library stores local wall-clock time ("2026-10-14T14:02:00").
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function savedText(timestamp: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(timestamp)
  if (!match) return timestamp || 'unknown'
  const [, , month, day, hours, minutes] = match
  return `${Number(day)} ${MONTHS[Number(month) - 1]}, ${hours}:${minutes}`
}
