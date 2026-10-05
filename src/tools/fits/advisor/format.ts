/** Number formatting for the advisor's messages, matching the screens ("−35 … −1 µm"). */

/** Rounded to 0.1, with a true minus sign and no trailing ".0". */
export function formatNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10 || 0
  return String(rounded).replace('-', '−')
}

export function formatRange(min: number, max: number, unit: string): string {
  return `${formatNumber(min)} … ${formatNumber(max)} ${unit}`
}

/** As formatNumber, with a '+' on positive values (for changes). */
export function formatChange(value: number): string {
  return `${value > 0 ? '+' : ''}${formatNumber(value)}`
}
