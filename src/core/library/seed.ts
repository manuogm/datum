// What a new browser starts with, so Datum is not empty: an "Examples"
// folder holding each tool's worked example. Their inputs are left null, so
// each tool opens them on its own default inputs; the summaries are what the
// tools compute for those defaults (checked by each tool's tests).
//
// The Tolerance Stack-up has two examples: the housing Part stack (inputs
// null, like the others) and the "Bearing end play" Assembly that links it,
// whose inputs are stored here (checked by the stack-up tool's tests).
import type { Calculation, CalculationSummary, Library, ToolId } from './model'

export const EXAMPLES_FOLDER_ID = 'examples'

/** Seeded examples have ids "example-…"; a calculation the user makes never does (see app/library/newId). */
const EXAMPLE_ID_PREFIX = 'example-'

/** A seeded worked example: a finished calculation to read, even before it is first saved. */
export const isSeededExample = (id: string): boolean => id.startsWith(EXAMPLE_ID_PREFIX)

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
  stack: {
    title: 'Housing: shoulder to circlip groove',
    status: 'pass',
    figures: [
      { label: 'WC', value: '20.825 … 21.095', unit: 'mm', lengthsMm: [20.825, 21.095] },
      { label: 'RSS', value: '20.881 … 21.039', unit: 'mm', lengthsMm: [20.8811013308, 21.0388986692] },
      { label: 'Cpk', value: '1.77' },
    ],
  },
}

const EXAMPLE_NAMES: Record<ToolId, string> = {
  fit: 'Steel pin in aluminium upright',
  bolt: 'Bracket through-bolt',
  lam: 'Quasi-isotropic skin',
  stack: 'Housing: shoulder to circlip groove',
}

const exampleId = (tool: ToolId) => `${EXAMPLE_ID_PREFIX}${tool}`

/**
 * The Assembly example of the Tolerance Stack-up: the axial end play of a
 * bearing between the housing shoulder and a circlip, linking the housing
 * Part stack (the "stack" example) as its first row. `last` is the housing
 * result as the assembly was saved with it (20.925 +0.170/−0.100, σ 0.0263).
 */
export const STACK_ASSEMBLY_EXAMPLE = {
  id: `${EXAMPLE_ID_PREFIX}stack-assembly`,
  name: 'Bearing end play',
  summary: {
    title: 'Bearing end play',
    status: 'review',
    figures: [
      { label: 'WC', value: '0.045 … 0.555', unit: 'mm', lengthsMm: [0.045, 0.555] },
      { label: 'RSS', value: '0.192 … 0.408', unit: 'mm', lengthsMm: [0.192180706736, 0.407819293264] },
      { label: 'Cpk', value: '1.85' },
    ],
  } satisfies CalculationSummary,
  /** The stored inputs, stamped with the time the linked housing example was saved. */
  inputs: (partSavedAt: string) => ({
    mode: 'assembly',
    partName: '',
    resultName: 'Bearing end play',
    requirement: { min: 0.1, max: 0.5 },
    method: 'worst-case',
    standard: 'iso',
    startLabel: '',
    endLabel: '',
    rows: [
      {
        kind: 'linked', id: 'r1', sensitivity: 1, calcId: exampleId('stack'),
        last: {
          stack: { name: 'Housing: shoulder to circlip groove', nominal: 20.925, mean: 20.96, upperDeviation: 0.17, lowerDeviation: -0.1, sigma: 0.0262995563968 },
          partName: 'Housing', resultName: 'Shoulder to circlip groove', calculationName: EXAMPLE_NAMES.stack,
          folderName: 'Examples', updatedAt: partSavedAt,
        },
      },
      dimension('r2', 'Bearing 6204 width', -1, 14, { kind: 'deviations', upper: 0, lower: -0.12 }),
      dimension('r3', 'Spacer length', -1, 5, { kind: 'symmetric', plusMinus: 0.03 }),
      dimension('r4', 'Circlip thickness', -1, 1.75, { kind: 'deviations', upper: 0, lower: -0.06 }),
    ],
  }),
}

function dimension(id: string, label: string, sensitivity: number, nominal: number, tolerance: object) {
  return { kind: 'dimension', id, label, sensitivity, nominal, tolerance, statistical: false, source: '' }
}

function exampleCalculation(tool: ToolId, now: string): Calculation {
  return {
    id: exampleId(tool),
    folderId: EXAMPLES_FOLDER_ID,
    tool,
    name: EXAMPLE_NAMES[tool],
    inputs: null,
    summary: EXAMPLE_SUMMARIES[tool],
    createdAt: now,
    updatedAt: now,
  }
}

/** The two Tolerance Stack-up examples: the housing Part stack and the Assembly that links it. */
function stackExamples(now: string): Calculation[] {
  const { id, name, summary, inputs } = STACK_ASSEMBLY_EXAMPLE
  return [
    exampleCalculation('stack', now),
    { id, folderId: EXAMPLES_FOLDER_ID, tool: 'stack', name, inputs: inputs(now), summary, createdAt: now, updatedAt: now },
  ]
}

const examplesFolder = (now: string) => ({ id: EXAMPLES_FOLDER_ID, name: 'Examples', parentId: null, createdAt: now })

/** The library of a first visit, stamped with the current time. */
export function seedLibrary(now: string): Library {
  return {
    folders: [examplesFolder(now)],
    calculations: [
      exampleCalculation('fit', now), exampleCalculation('bolt', now), exampleCalculation('lam', now),
      ...stackExamples(now),
    ],
  }
}

/**
 * A library saved before the Tolerance Stack-up shipped, with its two
 * examples added to the Examples folder (made again if it was deleted).
 * Nothing else changes; an example already there (same id) is left alone.
 */
export function withStackExamples(library: Library, now: string): Library {
  const missing = stackExamples(now).filter((example) => !library.calculations.some((c) => c.id === example.id))
  if (missing.length === 0) return library
  const hasFolder = library.folders.some((f) => f.id === EXAMPLES_FOLDER_ID)
  return {
    folders: hasFolder ? library.folders : [...library.folders, examplesFolder(now)],
    calculations: [...library.calculations, ...missing],
  }
}
