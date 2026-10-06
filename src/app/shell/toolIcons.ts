// The glyph that stands for each tool in tabs, folder lists and the tool picker.
import type { ToolId } from '../../core/library'
import type { IconName } from '../ui'

export const TOOL_ICONS: Record<ToolId, IconName> = {
  fit: 'tool-fit',
  bolt: 'tool-bolt',
  lam: 'tool-lam',
}
