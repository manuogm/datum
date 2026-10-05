// Demo projects shown on first run, so Datum is not empty. They follow the
// Turn 2 designs (FW-27 Rear upright and its neighbours). The numbers are
// worked through where the designs show them (e.g. Ø25 H7/g6 → 7…41 µm),
// but they are examples, not project data.
import type { Calculation, Decision, DesignTargets, Person, Project, ProjectsState, TeamMember } from './model'
import { partIdFor, revisionId } from './identifiers'
import type { SnapshotFigure, ToolId, ToolSnapshot } from './revision'
import { revLetter } from './revLetters'

const MR: Person = { initials: 'MR', name: 'M. Reyes' }
const JO: Person = { initials: 'JO', name: 'J. Okafor' }
const AL: Person = { initials: 'AL', name: 'A. Lindqvist' }

const TEAM: TeamMember[] = [
  { ...MR, role: 'Owner' },
  { ...JO, role: 'Approver' },
  { ...AL, role: 'Stress' },
]

const TARGETS: DesignTargets = {
  serviceTempMinC: -20,
  serviceTempMaxC: 140,
  minSafetyFactorMetallic: 1.5,
  minReserveFactorComposite: 1.5,
  minSlipSafety: 1.8,
}

interface RevisionSeed {
  at: string
  by: Person
  note: string
  status: ToolSnapshot['status']
  title: string
  figures: [label: string, value: string, unit?: string][]
  inputs?: unknown
  materialIds?: string[]
  report?: boolean
}

function calculation(id: string, tool: ToolId, partId: string, revisions: RevisionSeed[]): Calculation {
  return {
    id,
    tool,
    partId,
    revisions: revisions.map((r, i) => ({
      id: revisionId(id, revLetter(i)),
      rev: revLetter(i),
      savedAt: r.at,
      author: r.by,
      note: r.note,
      reportAttached: r.report ?? false,
      snapshot: {
        tool,
        title: r.title,
        status: r.status,
        figures: r.figures.map(([label, value, unit]): SnapshotFigure => (unit ? { label, value, unit } : { label, value })),
        inputs: r.inputs ?? {},
        ...(r.materialIds && { materialIds: r.materialIds }),
      },
    })),
  }
}

function parts(...names: string[]): Project['parts'] {
  return names.map((name) => ({ id: partIdFor(name, []), name }))
}

function approved(id: string, title: string, rationale: string, at: string, basis?: Decision['basis']): Decision {
  return { id, title, rationale, status: 'approved', proposedBy: MR, recordedAt: at, approvedBy: JO, approvedAt: at, basis }
}

interface FitRequirements {
  functions: string[]
  assembly: 'by-hand' | 'press' | 'thermal'
  serviceTempC: [min: number, max: number]
  requiredClearanceUm: [min: number, max: number]
  maxAssemblyInterferenceUm?: number
}

/**
 * The inputs of a fit saved from the calculator, in the Fit Tolerance tool's
 * FitInputs shape. The tool's tests check that every seed reopens exactly as
 * stored and that its figures are the ones the tool computes.
 */
function fitInputs(nominalMm: number, fit: string, [housingMaterialId, shaftMaterialId]: [string, string], needs: FitRequirements) {
  const [hole, shaft] = fit.split('/').map((zone) => /^([a-z]+)(\d+)$/i.exec(zone) ?? ['', '', ''])
  return {
    mode: 'calculator',
    nominalMm,
    hole: { kind: 'hole', letter: hole[1].toLowerCase(), grade: hole[2] },
    shaft: { kind: 'shaft', letter: shaft[1], grade: shaft[2] },
    functions: needs.functions,
    housingMaterialId,
    shaftMaterialId,
    assembly: needs.assembly,
    serviceTempC: { minC: needs.serviceTempC[0], maxC: needs.serviceTempC[1] },
    requiredClearanceUm: { minUm: needs.requiredClearanceUm[0], maxUm: needs.requiredClearanceUm[1] },
    maxAssemblyInterferenceUm: needs.maxAssemblyInterferenceUm ?? 40,
  }
}

const FW27_TEMP_C: [number, number] = [TARGETS.serviceTempMinC, TARGETS.serviceTempMaxC]
const UPRIGHT_PIN: [string, string] = ['al-7075-t6', 'steel-42crmo4-qt']
const LOCATE_PIN = { functions: ['locate', 'transmit-torque'], serviceTempC: FW27_TEMP_C }

const REAR_UPRIGHT: Project = {
  id: 'P-0142',
  name: 'FW-27 Rear upright',
  program: 'FW-27',
  stage: 'open',
  createdAt: '2026-09-12T09:00:00',
  parts: parts('Bearing carrier pin', 'Caliper mount pattern', 'Wishbone clevis', 'Wishbone tube', 'Upright body'),
  targets: TARGETS,
  team: TEAM,
  calculations: [
    calculation('MD-0009', 'mat', 'upright-body', [
      {
        at: '2026-09-14T10:40:00', by: MR, status: 'pass', title: 'Al 7075-T6',
        note: 'Machined from billet; see D-001.',
        figures: [['Material', 'Al 7075-T6'], ['Rp0.2', '503', 'MPa'], ['α', '23.4', 'µm/(m·K)']],
        inputs: { materialId: 'al-7075-t6' },
        materialIds: ['al-7075-t6'],
      },
    ]),
    calculation('BJ-0175', 'bolt', 'wishbone-clevis', [
      {
        at: '2026-09-24T14:05:00', by: AL, status: 'pass', title: 'M8 clevis bolt, double shear',
        note: 'Clevis bolt sized for the bump case.',
        figures: [['Utilisation', '0.62'], ['Slip safety S_G', '2.10']],
      },
    ]),
    calculation('FT-0412', 'fit', 'bearing-carrier-pin', [
      {
        at: '2026-09-28T10:15:00', by: MR, status: 'pass', title: 'Ø25 H7/f7',
        note: 'First pass: running clearance for easy assembly.',
        figures: [['Fit', 'H7/f7'], ['Nominal', '25.000', 'mm'], ['C at −20 °C', '7.7 … 49.7', 'µm'], ['C at 20 °C', '20 … 62', 'µm'], ['C at 140 °C', '56.9 … 98.9', 'µm']],
        inputs: fitInputs(25, 'H7/f7', UPRIGHT_PIN, { functions: ['locate', 'slide'], assembly: 'by-hand', serviceTempC: FW27_TEMP_C, requiredClearanceUm: [0, 100] }),
        materialIds: ['al-7075-t6', 'steel-42crmo4-qt'],
      },
      {
        at: '2026-10-02T15:10:00', by: MR, status: 'review', title: 'Ø25 H7/g6',
        note: 'Tightened from H7/f7 for location accuracy.',
        figures: [['Fit', 'H7/g6'], ['Nominal', '25.000', 'mm'], ['C at −20 °C', '−5.3 … 28.7', 'µm'], ['C at 20 °C', '7 … 41', 'µm'], ['C at 140 °C', '43.9 … 77.9', 'µm']],
        inputs: fitInputs(25, 'H7/g6', UPRIGHT_PIN, { ...LOCATE_PIN, assembly: 'by-hand', requiredClearanceUm: [0, 40] }),
        materialIds: ['al-7075-t6', 'steel-42crmo4-qt'],
      },
      {
        at: '2026-10-05T14:32:00', by: MR, status: 'pass', title: 'Ø25 H7/p6', report: true,
        note: 'Advisor flagged H7/g6 too loose at temperature. Switched to H7/p6, housing heated for assembly.',
        figures: [['Fit', 'H7/p6'], ['Nominal', '25.000', 'mm'], ['C at −20 °C', '−47.3 … −13.3', 'µm'], ['C at 20 °C', '−35 … −1', 'µm'], ['C at 140 °C', '1.9 … 35.9', 'µm']],
        inputs: fitInputs(25, 'H7/p6', UPRIGHT_PIN, { ...LOCATE_PIN, assembly: 'thermal', requiredClearanceUm: [-50, 40] }),
        materialIds: ['al-7075-t6', 'steel-42crmo4-qt'],
      },
    ]),
    calculation('CL-0093', 'lam', 'wishbone-tube', [
      {
        at: '2026-10-03T09:20:00', by: AL, status: 'review', title: '[0/±45/90]s',
        note: 'First pass. 90° plies critical under combined Nx + Nxy.',
        figures: [['RF min', '1.09'], ['Critical plies', '4–5']],
        materialIds: ['cfrp-t700-m21-qi'],
      },
    ]),
    calculation('MD-0012', 'mat', 'wishbone-clevis', [
      {
        at: '2026-10-04T16:48:00', by: MR, status: 'pass', title: 'Ti-6Al-4V Grade 5',
        note: 'Chosen over 7075-T6 for fatigue at 140 °C and thermal match with the steel pin.',
        figures: [['Material', 'Ti-6Al-4V Grade 5'], ['Rp0.2', '880', 'MPa'], ['α', '8.6', 'µm/(m·K)']],
        inputs: { materialId: 'ti-6al-4v' },
        materialIds: ['ti-6al-4v'],
      },
    ]),
    calculation('BJ-0187', 'bolt', 'caliper-mount-pattern', [
      {
        at: '2026-10-01T09:40:00', by: AL, status: 'fail', title: '8-bolt pattern, LC3',
        note: 'Helicoil inserts at all eight positions. B4 overloaded in braking + cornering.',
        figures: [['B4/B8', 'Helicoil'], ['u max', '1.08']],
      },
      {
        at: '2026-10-05T11:05:00', by: AL, status: 'review', title: '8-bolt pattern, LC3',
        note: 'Replaced Helicoils at B4/B8 with Keenserts. B4 still above 85 % in braking + cornering.',
        figures: [['B4/B8', 'Keensert'], ['u max', '0.91']],
      },
    ]),
  ],
  decisions: [
    approved('D-001', '7075-T6 billet for the upright body', 'Stiffness for weight and machinability; hard anodised against corrosion.', '2026-09-14T11:00:00', { calculationId: 'MD-0009', rev: 'A' }),
    approved('D-002', 'Bearing carrier pin in 42CrMo4 +QT', 'Wear resistance at the bearing seat; nitrided after grinding.', '2026-09-18T16:20:00'),
    approved('D-003', 'M4 fasteners for the caliper mount', 'Package space between the caliper ears leaves no room for M5.', '2026-09-25T10:30:00'),
    approved('D-004', 'Wishbone tubes in CFRP T700/M21', 'Same prepreg system as the front wishbones; tooling exists.', '2026-09-29T09:10:00'),
    approved('D-005', 'Ti-6Al-4V for wishbone clevis', 'Fatigue strength at temperature and α close to the steel pin (8.6 vs 11.1 µm/m·K).', '2026-10-04T17:02:00', { calculationId: 'MD-0012', rev: 'A' }),
    {
      id: 'D-006', title: 'Keensert inserts for M4 into 7075 upright', status: 'proposed', proposedBy: AL,
      rationale: 'Higher pull-out than Helicoil in thin walls. B4 still needs a margin review.',
      recordedAt: '2026-10-05T11:05:00', basis: { calculationId: 'BJ-0187', rev: 'B' },
    },
    {
      ...approved('D-007', 'Carrier pin fit changed to H7/p6', 'Aluminium upright grows 37 µm more than the steel pin at 140 °C. A room-temperature clearance fit loses location in service.', '2026-10-05T14:32:00', { calculationId: 'FT-0412', rev: 'C' }),
      approvedAt: '2026-10-05T14:50:00',
    },
  ],
}

function demoProject(
  project: Pick<Project, 'id' | 'name' | 'program' | 'createdAt' | 'parts' | 'calculations'> & Partial<Project>,
): Project {
  return { stage: 'open', targets: TARGETS, team: TEAM.slice(0, 2), decisions: [], ...project }
}

const OTHER_PROJECTS: Project[] = [
  demoProject({
    id: 'P-0139', name: 'Battery module M3 · busbar clamp', program: 'EV Battery Gen 3', createdAt: '2026-09-20T09:00:00',
    targets: { ...TARGETS, serviceTempMinC: -30, serviceTempMaxC: 85 },
    parts: parts('Busbar clamp', 'Clamp screws', 'Housing boss', 'Insulator'),
    calculations: [
      calculation('FT-0405', 'fit', 'housing-boss', [
        { at: '2026-09-30T13:15:00', by: MR, status: 'pass', title: 'Ø6 H8/f7', note: 'Locating spigot for the clamp.',
          figures: [['Fit', 'H8/f7'], ['Nominal', '6.000', 'mm'], ['C at −30 °C', '9.5 … 39.5', 'µm'], ['C at 20 °C', '10 … 40', 'µm'], ['C at 85 °C', '10.6 … 40.6', 'µm']],
          inputs: fitInputs(6, 'H8/f7', ['pa66-gf30', 'al-6082-t6'], { functions: ['locate'], assembly: 'by-hand', serviceTempC: [-30, 85], requiredClearanceUm: [0, 60] }),
          materialIds: ['pa66-gf30', 'al-6082-t6'] },
      ]),
      calculation('BJ-0181', 'bolt', 'clamp-screws', [
        { at: '2026-10-04T17:05:00', by: MR, status: 'review', title: 'M5 into PA66',
          note: 'Preload loss from creep in the PA66 boss needs a test.', figures: [['Preload loss', '18', '%'], ['u max', '0.78']],
          materialIds: ['pa66-gf30'] },
      ]),
    ],
  }),
  demoProject({
    id: 'P-0131', name: 'Front wing endplate', program: 'FW-27', createdAt: '2026-09-02T09:00:00',
    parts: parts('Endplate skin', 'Footplate', 'Mounting brackets'),
    calculations: [
      calculation('CL-0090', 'lam', 'endplate-skin', [
        { at: '2026-09-19T10:00:00', by: AL, status: 'fail', title: '[0/90]s', note: 'Too soft in torsion.', figures: [['RF min', '0.84']] },
        { at: '2026-09-23T15:30:00', by: AL, status: 'review', title: '[0/±45]s', note: 'Added ±45 plies.', figures: [['RF min', '1.21']] },
        { at: '2026-09-29T11:45:00', by: AL, status: 'pass', title: '[0/±45/90]s', note: 'Balanced stack.', figures: [['RF min', '1.62']] },
        { at: '2026-10-02T11:20:00', by: AL, status: 'pass', title: '[0/±45/90]s', note: 'Updated to the new aero loads.', figures: [['RF min', '1.55']],
          materialIds: ['cfrp-t700-m21-qi'] },
      ]),
    ],
  }),
  demoProject({
    id: 'P-0128', name: 'Gearbox output shaft', program: 'FW-27', stage: 'released', createdAt: '2026-08-11T09:00:00',
    parts: parts('Output shaft', 'Bearing seats', 'Spline', 'Seal surface', 'Retaining nut'),
    calculations: [
      calculation('FT-0377', 'fit', 'bearing-seats', [
        { at: '2026-09-29T09:30:00', by: MR, status: 'pass', title: 'Ø40 H6/k5', note: 'Inner ring seat for the rotating shaft.',
          figures: [['Fit', 'H6/k5'], ['Nominal', '40.000', 'mm'], ['C at −20 °C', '−13 … 14', 'µm'], ['C at 20 °C', '−13 … 14', 'µm'], ['C at 140 °C', '−13 … 14', 'µm']],
          inputs: fitInputs(40, 'H6/k5', ['steel-42crmo4-qt', 'steel-42crmo4-qt'], { functions: ['locate', 'rotate'], assembly: 'press', serviceTempC: FW27_TEMP_C, requiredClearanceUm: [-20, 20] }),
          materialIds: ['steel-42crmo4-qt'] },
      ]),
    ],
  }),
  demoProject({
    id: 'P-0125', name: 'Wishbone carbon tubes', program: 'FW-27', createdAt: '2026-08-30T09:00:00',
    parts: parts('Front upper', 'Front lower', 'Rear upper', 'Rear lower'),
    calculations: [
      calculation('CL-0088', 'lam', 'rear-lower', [
        { at: '2026-09-27T16:00:00', by: AL, status: 'review', title: '[0₂/±45]s', note: 'Buckling margin to be confirmed with the new wall.',
          figures: [['RF min', '1.12']], materialIds: ['cfrp-ud-0'] },
      ]),
    ],
  }),
  demoProject({
    id: 'P-0119', name: 'UAV wing spar joint', program: 'Aero · Halcyon', createdAt: '2026-09-01T09:00:00',
    targets: { ...TARGETS, serviceTempMinC: -40, serviceTempMaxC: 70 },
    parts: parts('Spar cap', 'Fitting', 'Shear pins'),
    calculations: [
      calculation('BJ-0164', 'bolt', 'fitting', [
        { at: '2026-09-21T12:00:00', by: MR, status: 'pass', title: '4 × M6 into Ti fitting', note: 'Fitting in Ti-6Al-4V.',
          figures: [['u max', '0.71'], ['Slip safety S_G', '1.95']], materialIds: ['ti-6al-4v'] },
      ]),
    ],
  }),
  demoProject({
    id: 'P-0114', name: 'Motor housing · stator fit', program: 'EV Drive Unit', stage: 'released', createdAt: '2026-08-04T09:00:00',
    parts: parts('Housing', 'Stator core'),
    calculations: [
      calculation('FT-0360', 'fit', 'stator-core', [
        { at: '2026-09-18T10:10:00', by: MR, status: 'review', title: 'Ø180 H7/s6',
          note: 'Shrink fit for the stator torque. The aluminium housing lets go of the core near 140 °C; the key carries the torque there.',
          figures: [['Fit', 'H7/s6'], ['Nominal', '180.000', 'mm'], ['C at −20 °C', '−218.7 … −153.7', 'µm'], ['C at 20 °C', '−133 … −68', 'µm'], ['C at 140 °C', '124 … 189', 'µm']],
          inputs: fitInputs(180, 'H7/s6', ['al-6082-t6', 'steel-c45-n'], { functions: ['transmit-torque'], assembly: 'thermal', serviceTempC: FW27_TEMP_C, requiredClearanceUm: [-200, -10], maxAssemblyInterferenceUm: 150 }),
          materialIds: ['al-6082-t6', 'steel-c45-n'] },
      ]),
    ],
  }),
  demoProject({
    id: 'P-0108', name: 'Battery tray crash rail', program: 'EV Battery Gen 3', stage: 'released', createdAt: '2026-07-28T09:00:00',
    parts: parts('Crash rail', 'Tray floor', 'Rail brackets', 'Rivnut joints'),
    calculations: [
      calculation('CL-0081', 'lam', 'crash-rail', [
        { at: '2026-09-09T15:00:00', by: AL, status: 'pass', title: 'GFRP crush tube', note: 'Released for the sled test.',
          figures: [['RF min', '1.74']], materialIds: ['gfrp-e-glass-qi'] },
      ]),
    ],
  }),
]

export function seedProjects(): ProjectsState {
  return { projects: [REAR_UPRIGHT, ...OTHER_PROJECTS], active: { projectId: 'P-0142', partId: 'bearing-carrier-pin' } }
}
