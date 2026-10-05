// A count with its noun in the right number: "1 calc", "2 calcs", "0 calcs".

export function countOf(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}
