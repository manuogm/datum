// How each tool is named in project history, and the prefix of its
// calculation numbers (FT-0412, BJ-0187 …).
import type { ToolId } from './revision'

export const TOOLS: Record<ToolId, { name: string; code: string }> = {
  fit: { name: 'Fit Tolerance', code: 'FT' },
  bolt: { name: 'Bolted Joint', code: 'BJ' },
  lam: { name: 'Laminate', code: 'CL' },
  mat: { name: 'Materials', code: 'MD' },
}

export const TOOL_IDS = Object.keys(TOOLS) as ToolId[]
