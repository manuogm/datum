/**
 * The fundamental deviation is the limit deviation closest to the nominal size
 * (ISO 286-1:2010, definition of fundamental deviation). Depending on the letter it is the upper or the
 * lower deviation; the other limit follows by adding or subtracting IT.
 */
export interface FundamentalDeviation {
  readonly limit: 'upper' | 'lower'
  readonly valueUm: number
}

export function notTabulatedMessage(symbol: string, grade: string, nominalMm: number, source: string): string {
  return `${symbol}${grade} is not defined for a nominal size of ${nominalMm} mm: ${source} has no value for "${symbol}" there.`
}
