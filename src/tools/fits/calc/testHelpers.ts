// Test helper for the ISO 286 size tables (see core/testing for the shared helpers).
import type { SizeTable } from './sizeTable'

/**
 * The rows of a SizeTable with both bounds and the size D used by the ISO 286
 * formulas: the geometric mean of the range bounds, with 1 mm as the lower
 * bound of the first range (ISO 286-1 basis of the system).
 */
export function rowsWithMeanSize<T>(table: SizeTable<T>) {
  return table.map(([upToMm, value], index) => {
    const overMm = index === 0 ? 0 : table[index - 1][0]
    return { overMm, upToMm, value, meanSizeMm: Math.sqrt(Math.max(overMm, 1) * upToMm) }
  })
}
