// Each tool's screens load as their own chunk on first use. One loader per
// tool, shared by the routes (App.tsx) and the New calculation dialog, so a
// chunk loads once.
import type { ToolId } from '../../core/library'
import type { ToolDefinition } from './toolDefinition'

export const loadFit = () => import('../../tools/fits/ui')
export const loadBolt = () => import('../../tools/bolted/ui')
export const loadLaminate = () => import('../../tools/laminate/ui')

/** What the library needs from a tool (its default inputs, snapshot builder …), loading it if need be. */
export function loadToolDefinition(tool: ToolId): Promise<ToolDefinition<unknown>> {
  switch (tool) {
    case 'fit':
      return loadFit().then((m) => m.FIT_TOOL as ToolDefinition<unknown>)
    case 'bolt':
      return loadBolt().then((m) => m.BOLT_TOOL as ToolDefinition<unknown>)
    case 'lam':
      return loadLaminate().then((m) => m.LAM_TOOL as ToolDefinition<unknown>)
  }
}
