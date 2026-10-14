/**
 * Complementary error function erfc(x), by the Chebyshev fit erfcc of
 * Press et al., Numerical Recipes in C (2nd ed. 1992) §6.2: fractional error below 1.2·10⁻⁷ everywhere, so even the
 * far tails (parts per billion) are accurate to 7 digits.
 */
export function erfc(x: number): number {
  const z = Math.abs(x)
  const t = 1 / (1 + 0.5 * z)
  const poly = -1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806
    + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))
  const value = t * Math.exp(-z * z + poly)
  return x >= 0 ? value : 2 - value
}

/** P(Z > z) for a standard normal Z: ½·erfc(z/√2). */
export function normalUpperTail(z: number): number {
  return 0.5 * erfc(z / Math.SQRT2)
}

