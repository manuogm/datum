// Small fixtures shared by the projects tests.
import type { ProjectDraft } from './commands'
import type { Person, ProjectsState } from './model'
import type { ToolSnapshot } from './revision'

export const EMPTY: ProjectsState = { projects: [], active: null }

export const ME: Person = { initials: 'MR', name: 'M. Reyes' }

export const DRAFT: ProjectDraft = {
  name: 'Rear brake caliper bracket',
  program: 'FW-27',
  parts: [{ name: 'Caliper bracket' }, { name: 'Mounting bolts' }, { name: 'Spacer bush' }],
  targets: {
    serviceTempMinC: -20,
    serviceTempMaxC: 160,
    minSafetyFactorMetallic: 1.5,
    minReserveFactorComposite: 1.5,
    minSlipSafety: 1.8,
  },
  team: [{ ...ME, role: 'Owner' }, { initials: 'JO', name: 'J. Okafor', role: 'Approver' }],
}

export function fitSnapshot(fit: string, c20: string, status: ToolSnapshot['status'] = 'pass'): ToolSnapshot {
  return {
    tool: 'fit',
    title: `Ø25 ${fit}`,
    status,
    figures: [
      { label: 'Fit', value: fit },
      { label: 'C at 20 °C', value: c20, unit: 'µm' },
    ],
    inputs: { nominalMm: 25, fit },
  }
}
