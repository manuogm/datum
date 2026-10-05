// Names shown for the advisor's choices, and the application presets of the
// APPLICATION select. A preset is only a shortcut that sets the function
// chips; the advisor itself works from the chips.
import type { ApplicationFunction, AssemblyMethod } from '../../advisor'

export const FUNCTION_LABELS: Record<ApplicationFunction, string> = {
  locate: 'Locate',
  'transmit-torque': 'Transmit torque',
  slide: 'Slide',
  rotate: 'Rotate',
  'disassemble-often': 'Disassemble often',
}

export const APPLICATION_FUNCTIONS = Object.keys(FUNCTION_LABELS) as ApplicationFunction[]

export const ASSEMBLY_LABELS: Record<AssemblyMethod, string> = {
  'by-hand': 'By hand',
  press: 'Press',
  thermal: 'Thermal',
}

export const ASSEMBLY_METHODS = Object.keys(ASSEMBLY_LABELS) as AssemblyMethod[]

export interface Application {
  readonly id: string
  readonly label: string
  readonly functions: readonly ApplicationFunction[]
}

export const APPLICATIONS: readonly Application[] = [
  { id: 'located-shaft', label: 'Shaft located in housing', functions: ['locate', 'transmit-torque'] },
  { id: 'locating-pin', label: 'Locating pin, removable', functions: ['locate', 'disassemble-often'] },
  { id: 'sliding', label: 'Sliding part, guided', functions: ['locate', 'slide'] },
  { id: 'running', label: 'Shaft running in a bush', functions: ['rotate'] },
]

/** Shown when the chips match no preset. */
export const CUSTOM_APPLICATION: Application = { id: 'custom', label: 'Custom', functions: [] }

/** The preset whose functions are exactly the chosen ones, in any order. */
export function applicationOf(functions: readonly ApplicationFunction[]): Application {
  const same = (preset: Application) =>
    preset.functions.length === functions.length && preset.functions.every((fn) => functions.includes(fn))
  return APPLICATIONS.find(same) ?? CUSTOM_APPLICATION
}
