// The Composite Laminate inputs as a URL query, so a calculation can be
// shared as a link. A laminate of one material travels as its stacking
// notation (#/lam?s=[0/±45/90]s&m=cfrp-im7-8552-ud), a mixed one as base64url
// JSON; loads, criterion and target only when they differ from the default.
// Reading goes through lamInputsFrom, so anything malformed keeps its default.
import { routeHref } from '../../../../app/router/routes'
import { parseDecimal } from '../../../../core/units'
import { formatLayup, parseLayup } from '../../calc'
import { DEFAULT_LAMINATE_INPUTS, DEFAULT_PLY_MATERIAL_ID, pliesAt, type LaminateInputs, type LoadSpec } from './lamInputs'
import { isPlyMaterialId, lamInputsFrom } from './readInputs'

/** Query parameter asking the report page to open the print dialog. */
export const PRINT_PARAM = 'print'

const KEY = { sequence: 's', material: 'm', plies: 'p', loads: 'n', criterion: 'c', target: 'rf' } as const

const LOAD_ORDER: readonly (keyof LoadSpec)[] = ['nxNPerMm', 'nyNPerMm', 'nxyNPerMm', 'mxN', 'myN', 'mxyN']

/** Link to the tool (or its printable report) with these inputs. */
export function lamHref(inputs: LaminateInputs, page: 'tool' | 'report' = 'tool', print = false): string {
  const params = [encodeLamInputs(inputs), print ? `${PRINT_PARAM}=1` : ''].filter((part) => part !== '')
  const path = routeHref({ name: page === 'tool' ? 'lam' : 'lamReport' })
  return params.length > 0 ? `${path}?${params.join('&')}` : path
}

/** Inputs → query string without the leading '?' (empty for the defaults). */
export function encodeLamInputs(inputs: LaminateInputs): string {
  const d = DEFAULT_LAMINATE_INPUTS
  const params = new URLSearchParams()
  if (JSON.stringify(inputs.plies) !== JSON.stringify(d.plies)) {
    const materials = new Set(inputs.plies.map((ply) => ply.materialId))
    const [materialId] = materials
    if (materials.size === 1) {
      params.set(KEY.sequence, formatLayup(inputs.plies.map((ply) => ply.angleDeg)))
      if (materialId !== DEFAULT_PLY_MATERIAL_ID) params.set(KEY.material, materialId)
    } else {
      params.set(KEY.plies, toBase64Url(JSON.stringify(inputs.plies)))
    }
  }
  const loads = LOAD_ORDER.map((key) => inputs.loads[key]).join(',')
  if (loads !== LOAD_ORDER.map((key) => d.loads[key]).join(',')) params.set(KEY.loads, loads)
  if (inputs.criterion !== d.criterion) params.set(KEY.criterion, inputs.criterion)
  if (inputs.targetReserveFactor !== d.targetReserveFactor) params.set(KEY.target, String(inputs.targetReserveFactor))
  return params.toString().replace(/%2C/g, ',')
}

/** Query string (with or without '?') → inputs, defaults for anything missing or invalid. */
export function decodeLamInputs(query: string): LaminateInputs {
  const params = new URLSearchParams(query.replace(/^\?/, ''))
  const loads = (params.get(KEY.loads) ?? '').split(',').map(parseDecimal)
  const target = parseDecimal(params.get(KEY.target) ?? '')
  return lamInputsFrom({
    plies: pliesOf(params),
    loads: loads.length === LOAD_ORDER.length ? Object.fromEntries(LOAD_ORDER.map((key, i) => [key, loads[i]])) : undefined,
    criterion: params.get(KEY.criterion) ?? undefined,
    targetReserveFactor: target ?? undefined,
  })
}

function pliesOf(params: URLSearchParams): unknown {
  const sequence = params.get(KEY.sequence)
  if (sequence !== null) {
    const angles = parseLayup(sequence)
    const material = params.get(KEY.material) ?? DEFAULT_PLY_MATERIAL_ID
    return angles.ok && isPlyMaterialId(material) ? pliesAt(angles.value, material) : undefined
  }
  const json = params.get(KEY.plies)
  return json === null ? undefined : fromBase64UrlJson(json)
}

function toBase64Url(text: string): string {
  const binary = Array.from(new TextEncoder().encode(text), (byte) => String.fromCharCode(byte)).join('')
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** The JSON value in a base64url text; null when it is not one. */
function fromBase64UrlJson(text: string): unknown {
  try {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))) as unknown
  } catch {
    return null
  }
}
