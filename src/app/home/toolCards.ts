// Content of the four tool cards on Home: fixed copy per tool plus the
// live tag and footnote derived from HomeData.
import type { HomeData, ToolSection } from './homeData'

export interface ToolCardContent {
  tool: ToolSection
  index: string
  tag: string
  title: string
  description: string
  footnote: string
}

const TOOL_COPY: readonly { tool: ToolSection; title: string; standard?: string; description: string }[] = [
  {
    tool: 'fit',
    title: 'Fit Tolerance',
    standard: 'ISO 286',
    description: 'Limits, clearance and interference, plus a fit advisor for your application.',
  },
  {
    tool: 'bolt',
    title: 'Bolted Joint',
    standard: 'VDI 2230',
    description: 'Single joints and bolt patterns with mixed fasteners and inserts.',
  },
  {
    tool: 'lam',
    title: 'Composite Laminate',
    standard: 'CLT',
    description: 'Ply stacking, laminate stiffness and first-ply failure.',
  },
  {
    tool: 'mat',
    title: 'Materials Database',
    description: 'Traceable properties shared by every tool, with temperature data.',
  },
]

export function toolCards(data: HomeData): ToolCardContent[] {
  return TOOL_COPY.map(({ tool, title, standard, description }, i) => {
    const last = tool === 'mat' ? undefined : data.lastCalculation[tool]
    return {
      tool,
      index: String(i + 1).padStart(2, '0'),
      tag: standard ?? `${data.materials.count} materials`,
      title,
      description,
      footnote: tool === 'mat' ? data.materials.sources.join(' · ') : last ? `LAST · ${last}` : 'NOT USED YET',
    }
  })
}
