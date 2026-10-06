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

/**
 * Inputs of the Bolted Joint tool (its BoltInputs shape) for the bolt
 * revisions: the joint, or the pattern, of the revision's mode; the tool
 * fills the other mode with its example. The tool's tests check that each
 * reopens with these inputs and that its figures are the ones it computes.
 */
const BOLT_DESIGN = {
  thread: { nominalMm: 10, pitchMm: 1.5 },
  propertyClass: '10.9',
  headType: 'hex',
  washers: false,
  joint: { kind: 'through-bolt' },
  plates: [{ materialId: 'al-7075-t6', thicknessMm: 12 }],
  outerDiameterMm: 30,
  tightening: 'torque-wrench',
  threadFriction: 0.12,
  headFriction: 0.12,
  interfaceFriction: 0.15,
  surfaceRoughness: 'rz-10-to-40',
  loadIntroduction: 'middle',
  frictionInterfaces: 1,
}

/** Fields that differ from BOLT_DESIGN. */
type BoltDesignSeed = Record<string, unknown>

const boltDesign = (changes: BoltDesignSeed) => ({ ...BOLT_DESIGN, ...changes })
const temperature = ([minC, maxC]: [number, number]) => ({ minC, maxC })

function boltJointInputs(serviceTempC: [number, number], design: BoltDesignSeed, loads: { axialMaxN: number; transverseN: number; transverseVariation: 'static' | 'alternating' }) {
  return { mode: 'joint', serviceTempC: temperature(serviceTempC), joint: { design: boltDesign(design), loads: { axialMinN: 0, ...loads } } }
}

interface PatternSeed {
  jointTypes: [id: string, design: BoltDesignSeed][]
  bolts: [id: string, xMm: number, yMm: number, jointTypeId: string][]
  loadCases: [id: string, name: string, forceN: [number, number, number], momentNm: [number, number, number], loadPointMm?: [number, number, number]][]
  shown: string
}

function boltPatternInputs(serviceTempC: [number, number], pattern: PatternSeed) {
  const vector = ([x, y, z]: [number, number, number]) => ({ x, y, z })
  return {
    mode: 'pattern',
    serviceTempC: temperature(serviceTempC),
    pattern: {
      jointTypes: pattern.jointTypes.map(([id, design]) => ({ id, design: boltDesign(design) })),
      bolts: pattern.bolts.map(([id, xMm, yMm, jointTypeId]) => ({ id, xMm, yMm, jointTypeId })),
      loadCases: pattern.loadCases.map(([id, name, forceN, momentNm, loadPointMm = [0, 0, 0]]) => ({
        id, name, forceN: vector(forceN), momentNm: vector(momentNm), loadPointMm: vector(loadPointMm),
      })),
      loadCaseId: pattern.shown,
    },
  }
}

/** The caliper mount of the Bolt Pattern design: socket head screws into the 7075 upright through a Ti bracket. */
const CALIPER_SCREW: BoltDesignSeed = { headType: 'socket', thread: { nominalMm: 4, pitchMm: 0.7 }, propertyClass: '12.9', plates: [{ materialId: 'ti-6al-4v', thicknessMm: 5 }], outerDiameterMm: 12 }
const HELICOIL: BoltDesignSeed = { ...CALIPER_SCREW, joint: { kind: 'insert', insert: 'helical-coil', materialId: 'al-7075-t6', engagementMm: 6, outerThread: null } }

function caliperMount(m4: [id: string, design: BoltDesignSeed][], outer: string): PatternSeed {
  return {
    jointTypes: [
      ['J1', { thread: { nominalMm: 12, pitchMm: 1.75 }, plates: [{ materialId: 'ti-6al-4v', thicknessMm: 10 }, { materialId: 'ti-6al-4v', thicknessMm: 10 }] }],
      ['J2', { ...CALIPER_SCREW, thread: { nominalMm: 6, pitchMm: 1 }, propertyClass: 'A4-80', outerDiameterMm: 16, plates: [{ materialId: 'ti-6al-4v', thicknessMm: 8 }], joint: { kind: 'tapped', materialId: 'ti-6al-4v', engagementMm: 9 } }],
      ...m4,
    ],
    bolts: [['B1', -60, -40, 'J1'], ['B2', 60, -40, 'J1'], ['B3', -60, 40, 'J3'], ['B4', 60, 40, outer], ['B5', 0, -55, 'J2'], ['B6', 0, 55, 'J2'], ['B7', -95, 0, 'J3'], ['B8', 95, 0, outer]],
    loadCases: [
      ['LC1', 'Static', [0, 0, 4000], [0, 0, 0]],
      ['LC2', 'Bump', [0, 0, 12000], [200, 0, 0]],
      ['LC3', 'Braking', [0, 6000, 14000], [300, 250, 400], [15, 10, 0]],
      ['LC4', 'Kerb', [4000, 0, 10000], [0, 300, 250]],
    ],
    shown: 'LC3',
  }
}
type LaminateLoadKey = 'nxNPerMm' | 'nyNPerMm' | 'nxyNPerMm' | 'mxN' | 'myN' | 'mxyN'

/**
 * Inputs of the Composite Laminate tool (its LaminateInputs shape): one ply
 * material at the angles of the stack, top ply first, under running loads in
 * N/mm and N·mm/mm, checked by Tsai-Wu against the composite reserve factor
 * target. The tool's tests check that each reopens with these inputs and that
 * its figures are the ones it computes.
 */
function laminateInputs(anglesDeg: number[], materialId: string, loads: Partial<Record<LaminateLoadKey, number>>) {
  return {
    plies: anglesDeg.map((angleDeg) => ({ materialId, angleDeg })),
    loads: { nxNPerMm: 0, nyNPerMm: 0, nxyNPerMm: 0, mxN: 0, myN: 0, mxyN: 0, ...loads },
    criterion: 'tsai-wu',
    targetReserveFactor: TARGETS.minReserveFactorComposite,
  }
}

/** Ply angles of the stacks in the demo projects. */
const QUASI_ISO = [0, 45, -45, 90, 90, -45, 45, 0] // [0/±45/90]s
const CROSS_PLY = [0, 90, 90, 0] // [0/90]s
const ANGLE_PLY = [0, 45, -45, -45, 45, 0] // [0/±45]s
/** Endplate skin, first three revisions: aero loads on the free edge. */
const ENDPLATE_LOADS = { nxNPerMm: 168, nxyNPerMm: 100 }

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
        at: '2026-09-24T14:05:00', by: AL, status: 'pass', title: 'M8 10.9 through-bolt',
        note: 'Clevis bolt through the Ti ears and the rod end, sized for the bump case.',
        figures: [['Bolt', 'M8 10.9'], ['u max', '0.86'], ['Governing', 'R8 Working stress'], ['MA', '35.6', 'N·m']],
        inputs: boltJointInputs(FW27_TEMP_C, {
          thread: { nominalMm: 8, pitchMm: 1.25 }, washers: true, outerDiameterMm: 20,
          plates: [{ materialId: 'ti-6al-4v', thicknessMm: 6 }, { materialId: 'steel-42crmo4-qt', thicknessMm: 14 }, { materialId: 'ti-6al-4v', thicknessMm: 6 }],
        }, { axialMaxN: 3000, transverseN: 600, transverseVariation: 'alternating' }),
        materialIds: ['ti-6al-4v', 'steel-42crmo4-qt'],
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
        figures: [['RF min', '1.27'], ['Critical plies', '4–5'], ['h', '1.000', 'mm']],
        inputs: laminateInputs(QUASI_ISO, 'cfrp-t700-m21-ud', { nxNPerMm: 250, nxyNPerMm: 80 }),
        materialIds: ['cfrp-t700-m21-ud'],
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
        note: 'Helicoils at the M4 positions. In braking the pattern slips: the friction comes almost entirely from the two M12s.',
        figures: [['Bolts', '8'], ['u max', '3.28'], ['Governing', 'B8 (J3) in LC3'], ['Load cases', '4']],
        inputs: boltPatternInputs(FW27_TEMP_C, caliperMount([['J3', HELICOIL]], 'J3')),
        materialIds: ['ti-6al-4v', 'al-7075-t6'],
      },
      {
        at: '2026-10-05T11:05:00', by: AL, status: 'fail', title: '8-bolt pattern, LC3',
        note: 'Keenserts (outer thread M6×1 from the catalogue) at B4/B8 for pull-out. Slip in braking still governs: shear pins to follow.',
        figures: [['Bolts', '8'], ['u max', '3.28'], ['Governing', 'B8 (J4) in LC3'], ['Load cases', '4']],
        inputs: boltPatternInputs(FW27_TEMP_C, caliperMount([
          ['J3', HELICOIL],
          ['J4', { ...CALIPER_SCREW, joint: { kind: 'insert', insert: 'key-locking', materialId: 'al-7075-t6', engagementMm: 8, outerThread: { nominalMm: 6, pitchMm: 1 } } }],
        ], 'J4')),
        materialIds: ['ti-6al-4v', 'al-7075-t6'],
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
      rationale: 'Higher pull-out than Helicoil and robust to reassembly; needs more wall. Slip in braking still fails for the pattern; shear pins proposed.',
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
        { at: '2026-10-04T17:05:00', by: MR, status: 'fail', title: 'M5 8.8 through-bolt',
          note: 'Busbar clamped on the PA66 boss. pG 60 MPa for PA66-GF30 is an assumed creep limit at 85 °C, to be confirmed by test: even so the washer crushes the boss. Compression limiter needed.',
          figures: [['Bolt', 'M5 8.8'], ['u max', '3.43'], ['Governing', 'R10 Surface pressure under head and nut'], ['MA', '5.8', 'N·m']],
          inputs: boltJointInputs([-30, 85], {
            thread: { nominalMm: 5, pitchMm: 0.8 }, propertyClass: '8.8', washers: true, outerDiameterMm: 14,
            plates: [{ materialId: 'cu-etp', thicknessMm: 3 }, { materialId: 'pa66-gf30', thicknessMm: 8, limitingPressureMPa: 60 }],
          }, { axialMaxN: 800, transverseN: 150, transverseVariation: 'static' }),
          materialIds: ['cu-etp', 'pa66-gf30'] },
      ]),
    ],
  }),
  demoProject({
    id: 'P-0131', name: 'Front wing endplate', program: 'FW-27', createdAt: '2026-09-02T09:00:00',
    parts: parts('Endplate skin', 'Footplate', 'Mounting brackets'),
    calculations: [
      calculation('CL-0090', 'lam', 'endplate-skin', [
        { at: '2026-09-19T10:00:00', by: AL, status: 'fail', title: '[0/90]s', note: 'No ±45 plies: τ12 = 200 MPa against S = 95 MPa cracks the matrix.',
          figures: [['RF min', '0.42'], ['Critical plies', '2–3'], ['h', '0.500', 'mm']],
          inputs: laminateInputs(CROSS_PLY, 'cfrp-t700-m21-ud', ENDPLATE_LOADS), materialIds: ['cfrp-t700-m21-ud'] },
        { at: '2026-09-23T15:30:00', by: AL, status: 'review', title: '[0/±45]s', note: 'Added ±45 plies.',
          figures: [['RF min', '1.47'], ['Critical plies', '3–4'], ['h', '0.750', 'mm']],
          inputs: laminateInputs(ANGLE_PLY, 'cfrp-t700-m21-ud', ENDPLATE_LOADS), materialIds: ['cfrp-t700-m21-ud'] },
        { at: '2026-09-29T11:45:00', by: AL, status: 'pass', title: '[0/±45/90]s', note: 'Quasi-isotropic stack.',
          figures: [['RF min', '1.58'], ['Critical plies', '3, 6'], ['h', '1.000', 'mm']],
          inputs: laminateInputs(QUASI_ISO, 'cfrp-t700-m21-ud', ENDPLATE_LOADS), materialIds: ['cfrp-t700-m21-ud'] },
        { at: '2026-10-02T11:20:00', by: AL, status: 'pass', title: '[0/±45/90]s', note: 'Updated to the new aero loads.',
          figures: [['RF min', '1.51'], ['Critical plies', '3, 6'], ['h', '1.000', 'mm']],
          inputs: laminateInputs(QUASI_ISO, 'cfrp-t700-m21-ud', { nxNPerMm: 165, nxyNPerMm: 108 }), materialIds: ['cfrp-t700-m21-ud'] },
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
          figures: [['RF min', '1.23'], ['Critical plies', '1–2, 7–8'], ['h', '1.000', 'mm']],
          inputs: laminateInputs([0, 0, 45, -45, -45, 45, 0, 0], 'cfrp-im7-8552-ud', { nxNPerMm: -400, nxyNPerMm: 80 }),
          materialIds: ['cfrp-im7-8552-ud'] },
      ]),
    ],
  }),
  demoProject({
    id: 'P-0119', name: 'UAV wing spar joint', program: 'Aero · Halcyon', createdAt: '2026-09-01T09:00:00',
    targets: { ...TARGETS, serviceTempMinC: -40, serviceTempMaxC: 70 },
    parts: parts('Spar cap', 'Fitting', 'Shear pins'),
    calculations: [
      calculation('BJ-0164', 'bolt', 'fitting', [
        { at: '2026-09-21T12:00:00', by: MR, status: 'pass', title: '4-bolt pattern, LC1', note: 'Four M6 12.9 screws through the 7075 spar cap strap, tapped into the Ti-6Al-4V fitting.',
          figures: [['Bolts', '4'], ['u max', '0.89'], ['Governing', 'B3 (J1) in LC1'], ['Load cases', '1']],
          inputs: boltPatternInputs([-40, 70], {
            jointTypes: [['J1', {
              thread: { nominalMm: 6, pitchMm: 1 }, propertyClass: '12.9', headType: 'socket', washers: true, outerDiameterMm: 16,
              plates: [{ materialId: 'al-7075-t6', thicknessMm: 10 }], joint: { kind: 'tapped', materialId: 'ti-6al-4v', engagementMm: 9 },
            }]],
            bolts: [['B1', -20, -15, 'J1'], ['B2', 20, -15, 'J1'], ['B3', 20, 15, 'J1'], ['B4', -20, 15, 'J1']],
            loadCases: [['LC1', 'Pull-up 4 g', [0, 1500, 4000], [20, 0, 0]]],
            shown: 'LC1',
          }),
          materialIds: ['al-7075-t6', 'ti-6al-4v'] },
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
        { at: '2026-09-09T15:00:00', by: AL, status: 'pass', title: '[±45/0₂]s', note: 'GFRP crush tube wall. Released for the sled test.',
          figures: [['RF min', '1.71'], ['Critical plies', '3–6'], ['h', '1.000', 'mm']],
          inputs: laminateInputs([45, -45, 0, 0, 0, 0, -45, 45], 'gfrp-e-glass-epoxy-ud', { nxNPerMm: -150 }),
          materialIds: ['gfrp-e-glass-epoxy-ud'] },
      ]),
    ],
  }),
]

export function seedProjects(): ProjectsState {
  return { projects: [REAR_UPRIGHT, ...OTHER_PROJECTS], active: { projectId: 'P-0142', partId: 'bearing-carrier-pin' } }
}
