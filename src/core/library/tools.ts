// How each tool is named in the library, with the one-line hint shown when
// picking a tool for a new calculation.
import type { ToolId } from './model'

export const TOOLS: Record<ToolId, { name: string; shortName: string; useWhen: string }> = {
  fit: {
    name: 'Fit Tolerance',
    shortName: 'Fit',
    useWhen: 'Use this when a shaft goes into a hole: pick or check an ISO 286 fit over the service temperatures.',
  },
  bolt: {
    name: 'Bolted Joint',
    shortName: 'Bolt',
    useWhen: 'Use this when parts are bolted together: size and check a joint or a bolt pattern to VDI 2230.',
  },
  lam: {
    name: 'Composite Laminate',
    shortName: 'Laminate',
    useWhen: 'Use this when designing a composite panel: stack plies and check stiffness and first-ply failure.',
  },
}

export const TOOL_IDS = Object.keys(TOOLS) as ToolId[]
