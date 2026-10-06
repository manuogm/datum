// What a new browser starts with, so Datum is not empty: an "Examples"
// folder holding each tool's worked example. Their inputs are left null, so
// each tool opens them on its own default inputs; the summaries are what the
// tools compute for those defaults (checked by each tool's tests).
import type { Calculation, CalculationSummary, Library, ToolId } from './model'

export const EXAMPLES_FOLDER_ID = 'examples'

/** The example calculation of each tool, as listed before it is first opened. */
export const EXAMPLE_SUMMARIES: Record<ToolId, CalculationSummary> = {
  fit: {
    title: 'Ø25 H7/k6',
    status: 'review',
    figures: [
      { label: 'C at −20 °C', value: '−27.3 … 6.7', unit: 'µm' },
      { label: 'C at 20 °C', value: '−15 … 19', unit: 'µm' },
      { label: 'C at 140 °C', value: '21.9 … 55.9', unit: 'µm' },
    ],
  },
  bolt: {
    title: 'M10 10.9 through-bolt',
    status: 'fail',
    figures: [
      { label: 'u max', value: '2.01' },
      { label: 'Governing', value: 'R12 Safety against slipping' },
      { label: 'MA', value: '71.2', unit: 'N·m' },
    ],
  },
  lam: {
    title: '[0/±45/90]s',
    status: 'review',
    figures: [
      { label: 'RF min', value: '1.26' },
      { label: 'Critical plies', value: '4–5' },
      { label: 'h', value: '1.000', unit: 'mm' },
    ],
  },
}

const EXAMPLE_NAMES: Record<ToolId, string> = {
  fit: 'Steel pin in aluminium upright',
  bolt: 'Bracket through-bolt',
  lam: 'Quasi-isotropic skin',
}

/** The library of a first visit, stamped with the current time. */
export function seedLibrary(now: string): Library {
  const example = (tool: ToolId): Calculation => ({
    id: `example-${tool}`,
    folderId: EXAMPLES_FOLDER_ID,
    tool,
    name: EXAMPLE_NAMES[tool],
    inputs: null,
    summary: EXAMPLE_SUMMARIES[tool],
    createdAt: now,
    updatedAt: now,
  })
  return {
    folders: [{ id: EXAMPLES_FOLDER_ID, name: 'Examples', parentId: null, createdAt: now }],
    calculations: [example('fit'), example('bolt'), example('lam')],
  }
}
