// The Fit Tolerance inputs as a short URL query, so a calculation can be
// shared as a link (#/fit?d=40&h=H7&s=p6). Only values that differ from the
// defaults are written. Reading ignores anything malformed and keeps the
// default for it, so an edited or old link never breaks the screen.
import { routeHref } from '../../../../app/router/routes'
import { parseDecimal } from '../../../../core/units'
import { formatZone } from '../../calc'
import { DEFAULT_FIT_INPUTS, type FitInputs } from './fitInputs'
import { asAssembly, asFunctions, asMaterialId, asMode, asZone } from './readInputs'

/** Query parameter asking the report page to open the print dialog. */
export const PRINT_PARAM = 'print'

/** Link to the tool (or its printable report) with these inputs. */
export function fitHref(inputs: FitInputs, page: 'tool' | 'report' = 'tool', print = false): string {
  const params = [encodeFitInputs(inputs), print ? `${PRINT_PARAM}=1` : ''].filter((part) => part !== '')
  const path = routeHref({ name: page === 'tool' ? 'fit' : 'fitReport' })
  return params.length > 0 ? `${path}?${params.join('&')}` : path
}

/** Query parameter for each input. */
const KEY = {
  mode: 'm',
  nominal: 'd',
  hole: 'h',
  shaft: 's',
  functions: 'f',
  housingMaterial: 'hm',
  shaftMaterial: 'sm',
  assembly: 'a',
  serviceTemp: 't',
  requiredClearance: 'c',
  maxInterference: 'i',
} as const

/** Inputs → query string without the leading '?' (empty for the defaults). */
export function encodeFitInputs(inputs: FitInputs): string {
  const d = DEFAULT_FIT_INPUTS
  const params = new URLSearchParams()
  const put = (key: string, value: string, defaultValue: string) => {
    if (value !== defaultValue) params.set(key, value)
  }
  put(KEY.mode, inputs.mode, d.mode)
  put(KEY.nominal, String(inputs.nominalMm), String(d.nominalMm))
  put(KEY.hole, formatZone(inputs.hole), formatZone(d.hole))
  put(KEY.shaft, formatZone(inputs.shaft), formatZone(d.shaft))
  put(KEY.functions, inputs.functions.join(','), d.functions.join(','))
  put(KEY.housingMaterial, inputs.housingMaterialId, d.housingMaterialId)
  put(KEY.shaftMaterial, inputs.shaftMaterialId, d.shaftMaterialId)
  put(KEY.assembly, inputs.assembly, d.assembly)
  put(KEY.serviceTemp, pair(inputs.serviceTempC.minC, inputs.serviceTempC.maxC), pair(d.serviceTempC.minC, d.serviceTempC.maxC))
  put(KEY.requiredClearance, pair(inputs.requiredClearanceUm.minUm, inputs.requiredClearanceUm.maxUm),
    pair(d.requiredClearanceUm.minUm, d.requiredClearanceUm.maxUm))
  put(KEY.maxInterference, String(inputs.maxAssemblyInterferenceUm), String(d.maxAssemblyInterferenceUm))
  // Keep commas and slashes readable in the link.
  return params.toString().replace(/%2C/g, ',')
}

/** Query string (with or without '?') → inputs, defaults for anything missing or invalid. */
export function decodeFitInputs(query: string): FitInputs {
  const params = new URLSearchParams(query.replace(/^\?/, ''))
  const read = <T>(key: string, parse: (text: string) => T | null, fallback: T): T => {
    const text = params.get(key)
    return (text === null ? null : parse(text)) ?? fallback
  }
  const d = DEFAULT_FIT_INPUTS
  const serviceTemp = read(KEY.serviceTemp, parsePair, null)
  const clearance = read(KEY.requiredClearance, parsePair, null)
  return {
    mode: read(KEY.mode, asMode, d.mode),
    nominalMm: read(KEY.nominal, parseDecimal, d.nominalMm),
    hole: read(KEY.hole, (text) => asZone(text, 'hole'), d.hole),
    shaft: read(KEY.shaft, (text) => asZone(text, 'shaft'), d.shaft),
    functions: read(KEY.functions, (text) => asFunctions(text === '' ? [] : text.split(',')), d.functions),
    housingMaterialId: read(KEY.housingMaterial, asMaterialId, d.housingMaterialId),
    shaftMaterialId: read(KEY.shaftMaterial, asMaterialId, d.shaftMaterialId),
    assembly: read(KEY.assembly, asAssembly, d.assembly),
    serviceTempC: serviceTemp ? { minC: serviceTemp[0], maxC: serviceTemp[1] } : d.serviceTempC,
    requiredClearanceUm: clearance ? { minUm: clearance[0], maxUm: clearance[1] } : d.requiredClearanceUm,
    maxAssemblyInterferenceUm: read(KEY.maxInterference, parseDecimal, d.maxAssemblyInterferenceUm),
  }
}

function pair(a: number, b: number): string {
  return `${a},${b}`
}

function parsePair(text: string): [number, number] | null {
  const [a, b, ...rest] = text.split(',').map(parseDecimal)
  return a != null && b != null && rest.length === 0 ? [a, b] : null
}
