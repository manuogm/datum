// The Bolted Joint inputs as a URL query, so a calculation can be shared as a
// link. The mode and temperature range are written plainly (#/bolt?m=pattern
// &t=-40,120); the joint and the pattern, being structured, travel as
// base64url JSON, each only when it differs from the default. Reading goes
// through boltInputsFrom, so anything malformed keeps its default.
import { routeHref } from '../../../../app/router/routes'
import { parseDecimal } from '../../../../core/units'
import { DEFAULT_BOLT_INPUTS, type BoltInputs } from './boltInputs'
import { boltInputsFrom } from './readInputs'

/** Query parameter asking the report page to open the print dialog. */
export const PRINT_PARAM = 'print'

const KEY = { mode: 'm', serviceTemp: 't', joint: 'j', pattern: 'p' } as const

/** Link to the tool (or its printable report) with these inputs. */
export function boltHref(inputs: BoltInputs, page: 'tool' | 'report' = 'tool', print = false): string {
  const params = [encodeBoltInputs(inputs), print ? `${PRINT_PARAM}=1` : ''].filter((part) => part !== '')
  const path = routeHref({ name: page === 'tool' ? 'bolt' : 'boltReport' })
  return params.length > 0 ? `${path}?${params.join('&')}` : path
}

/** Inputs → query string without the leading '?' (empty for the defaults). */
export function encodeBoltInputs(inputs: BoltInputs): string {
  const d = DEFAULT_BOLT_INPUTS
  const params = new URLSearchParams()
  if (inputs.mode !== d.mode) params.set(KEY.mode, inputs.mode)
  const temp = `${inputs.serviceTempC.minC},${inputs.serviceTempC.maxC}`
  if (temp !== `${d.serviceTempC.minC},${d.serviceTempC.maxC}`) params.set(KEY.serviceTemp, temp)
  const joint = JSON.stringify(inputs.joint)
  if (joint !== JSON.stringify(d.joint)) params.set(KEY.joint, toBase64Url(joint))
  const pattern = JSON.stringify(inputs.pattern)
  if (pattern !== JSON.stringify(d.pattern)) params.set(KEY.pattern, toBase64Url(pattern))
  return params.toString().replace(/%2C/g, ',')
}

/** Query string (with or without '?') → inputs, defaults for anything missing or invalid. */
export function decodeBoltInputs(query: string): BoltInputs {
  const params = new URLSearchParams(query.replace(/^\?/, ''))
  const [minC, maxC, ...rest] = (params.get(KEY.serviceTemp) ?? '').split(',').map(parseDecimal)
  const json = (key: string) => {
    const text = params.get(key)
    return text === null ? undefined : fromBase64UrlJson(text)
  }
  return boltInputsFrom({
    mode: params.get(KEY.mode) ?? undefined,
    serviceTempC: rest.length === 0 ? { minC, maxC } : undefined,
    joint: json(KEY.joint) ?? DEFAULT_BOLT_INPUTS.joint,
    pattern: json(KEY.pattern),
  })
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
