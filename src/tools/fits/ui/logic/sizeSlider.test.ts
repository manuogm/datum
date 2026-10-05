import { describe, expect, it } from 'vitest'
import { SLIDER_STEPS, sliderPosition, sliderSizeMm, tickPercent } from './sizeSlider'

describe('size slider', () => {
  it('is logarithmic from 1 to 500 mm', () => {
    expect(sliderPosition(1)).toBe(0)
    expect(sliderPosition(500)).toBe(SLIDER_STEPS)
    expect(sliderPosition(Math.sqrt(500))).toBe(SLIDER_STEPS / 2)
  })

  it('holds sizes outside the range at the ends', () => {
    expect(sliderPosition(0.5)).toBe(0)
    expect(sliderPosition(2000)).toBe(SLIDER_STEPS)
  })

  it('rounds picked sizes to two significant figures in the viewer unit', () => {
    expect(sliderSizeMm(sliderPosition(25), 'si')).toBe(25)
    expect(sliderSizeMm(sliderPosition(137), 'si')).toBe(140)
    expect(sliderSizeMm(sliderPosition(3.43), 'si')).toBe(3.4)
    expect(sliderSizeMm(sliderPosition(25.4), 'imperial')).toBeCloseTo(25.4)
  })

  it('places ticks at their size', () => {
    expect(tickPercent(1, 'si')).toBe(0)
    expect(tickPercent(500, 'si')).toBe(100)
    expect(tickPercent(1, 'imperial')).toBe((sliderPosition(25.4) / SLIDER_STEPS) * 100)
  })
})
