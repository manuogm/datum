import { describe, expect, it } from 'vitest'
import { expectOk } from '../../../../core/testing'
import { DEFAULT_BOLT_INPUTS, DEFAULT_JOINT_DESIGN } from '../state/boltInputs'
import { analyseJoint } from './boltResults'
import { SECTION_FRAME as FRAME, sectionInputOf, sectionLayout, type SectionInput } from './sectionDiagram'

const THROUGH: SectionInput = {
  nominalMm: 10,
  headType: 'hex',
  headBearingMm: 15,
  clearanceHoleMm: 11,
  washer: null,
  plates: [{ thicknessMm: 12, family: 'aluminium' }, { thicknessMm: 8, family: 'steel' }],
  outerDiameterMm: 30,
  coneAngleDeg: 30,
  joint: { kind: 'through-bolt', nutBearingMm: 15 },
}

const TAPPED: SectionInput = { ...THROUGH, plates: [THROUGH.plates[0]], joint: { kind: 'tapped', engagementMm: 12, family: 'titanium' } }

describe('sectionLayout', () => {
  it('stacks head, plates and nut to scale, inside the frame', () => {
    const layout = sectionLayout(THROUGH)
    const [upper, lower] = layout.parts.map((p) => p.rect)
    expect(upper.y).toBeCloseTo(layout.head.y + layout.head.height)
    expect(lower.y).toBeCloseTo(upper.y + upper.height)
    expect(upper.height / lower.height).toBeCloseTo(12 / 8)
    expect(layout.nut?.y).toBeCloseTo(lower.y + lower.height)
    for (const rect of [layout.head, upper, lower, layout.nut!, layout.shank]) {
      expect(rect.x).toBeGreaterThanOrEqual(0)
      expect(rect.y).toBeGreaterThanOrEqual(0)
      expect(rect.x + rect.width).toBeLessThanOrEqual(FRAME.width)
      expect(rect.y + rect.height).toBeLessThanOrEqual(FRAME.height)
    }
  })

  it('cuts the cone off at the outer diameter DA', () => {
    const [left, right] = sectionLayout({ ...THROUGH, outerDiameterMm: 18 }).cone
    const plate = sectionLayout({ ...THROUGH, outerDiameterMm: 18 }).parts[0].rect
    expect(Math.max(...right.map((p) => p.x))).toBeCloseTo(plate.x + plate.width)
    expect(Math.min(...left.map((p) => p.x))).toBeCloseTo(plate.x)
  })

  it('draws a through-bolt cone from both ends, meeting half-way', () => {
    const right = sectionLayout(THROUGH).cone[1]
    const widest = right.reduce((a, b) => (b.x > a.x ? b : a))
    const parts = sectionLayout(THROUGH).parts.map((p) => p.rect)
    const middle = (parts[0].y + parts[1].y + parts[1].height) / 2
    expect(widest.y).toBeCloseTo(middle)
    expect(right[0].y).toBeCloseTo(right[right.length - 1].y - (parts[1].y + parts[1].height - parts[0].y))
  })

  it('screws a tapped joint into a part below the plates, without a nut', () => {
    const layout = sectionLayout(TAPPED)
    expect(layout.nut).toBeNull()
    expect(layout.parts.map((p) => p.family)).toEqual(['aluminium', 'titanium'])
    expect(layout.engagement?.y).toBeCloseTo(layout.parts[1].rect.y)
    expect(layout.shank.y + layout.shank.height).toBeCloseTo(layout.engagement!.y + layout.engagement!.height)
    expect(layout.insert).toBeNull()
  })

  it('draws an insert wider than the bolt', () => {
    const layout = sectionLayout({ ...TAPPED, joint: { kind: 'insert', engagementMm: 12, family: 'aluminium', insertDiameterMm: 14 } })
    expect(layout.insert!.width / layout.shank.width).toBeCloseTo(1.4)
  })
})

describe('sectionInputOf', () => {
  it('takes the drawing sizes from the analysis and the materials from the inputs', () => {
    const analysis = expectOk(analyseJoint(DEFAULT_BOLT_INPUTS, 'si'))
    const input = sectionInputOf(analysis, DEFAULT_JOINT_DESIGN)
    expect(input.plates).toEqual([{ thicknessMm: 12, family: 'aluminium' }, { thicknessMm: 8, family: 'steel' }])
    expect(input.coneAngleDeg).toBe(analysis.resilience.coneAngleDeg)
    expect(input.joint.kind).toBe('through-bolt')
  })
})
