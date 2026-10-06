import { describe, expect, it } from 'vitest'
import { expectOk } from '../../../../core/testing'
import { DEFAULT_LAMINATE_INPUTS } from '../state/lamInputs'
import { analyse } from './lamResults'
import { pointValue, THICKNESS_FRAME as FRAME, thicknessLayout } from './thicknessPlot'

describe('thicknessLayout', () => {
  it('maps the top face to the top of the frame and draws each ply from 0 to its values', () => {
    const layout = thicknessLayout(
      [
        { index: 1, zTopMm: 0.5, zBottomMm: 0, top: 100, bottom: 50, tone: 'ok' },
        { index: 2, zTopMm: 0, zBottomMm: -0.5, top: -40, bottom: -40, tone: 'bad' },
      ],
      1,
    )
    expect(layout.zTicks.map((t) => t.y)).toEqual([FRAME.top, (FRAME.top + FRAME.bottom) / 2, FRAME.bottom])
    expect(layout.valueTicks[0].value).toBeLessThanOrEqual(-40)
    expect(layout.bars[0].points.split(' ')[0]).toBe(`${layout.zeroX},${FRAME.top}`)
    expect(layout.bars[0].label).toMatchObject({ value: 100, anchor: 'start' })
    expect(layout.bars[1].label).toMatchObject({ value: -40, anchor: 'end' })
  })

  it('places reference lines on the value axis', () => {
    const layout = thicknessLayout([{ index: 1, zTopMm: 0.5, zBottomMm: -0.5, top: 0.4, bottom: 0.4, tone: 'ok' }], 1, [1 / 1.5, 1])
    expect(layout.references.map((r) => r.value)).toEqual([1 / 1.5, 1])
    expect(layout.references[1].x).toBeLessThanOrEqual(FRAME.right)
  })
})

describe('pointValue', () => {
  it('gives stresses in the display unit and strain in %', () => {
    const top = expectOk(analyse(DEFAULT_LAMINATE_INPUTS)).plies[0].top
    expect(pointValue(top, 'sx', 'si')).toBeCloseTo(top.stressGlobalMPa[0])
    expect(pointValue(top, 'sx', 'imperial')).toBeCloseTo(top.stressGlobalMPa[0] * 0.1450377)
    expect(pointValue(top, 'ex', 'si')).toBeCloseTo(top.strainGlobal[0] * 100)
    expect(pointValue(top, 'fi', 'si')).toBe(top.failureIndex)
  })
})
