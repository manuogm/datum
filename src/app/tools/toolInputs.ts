// How a tool screen's inputs travel: the query of the URL hash carries them
// as a shareable link, a project revision stores them, and a fresh
// calculation starts from defaults with the active project's service
// temperatures. Each tool supplies a codec for its own inputs.

export interface TemperatureRange {
  readonly minC: number
  readonly maxC: number
}

export interface ToolInputsCodec<Inputs> {
  /** Query string (without '?') → inputs; anything malformed keeps its default. */
  decode: (query: string) => Inputs
  /** Inputs stored in a saved revision → inputs; anything malformed keeps its default. */
  fromSaved: (saved: unknown) => Inputs
  /** The tool's link with these inputs. */
  href: (inputs: Inputs) => string
  /** A fresh calculation, at the active project's service temperatures when there is one. */
  fresh: (projectServiceTempC?: TemperatureRange) => Inputs
}

/** The query part of the URL hash ('#/fit?d=25' → 'd=25'). */
export function hashQuery(): string {
  return window.location.hash.split('?')[1] ?? ''
}

export interface StartingPoint {
  /** The inputs of a revision being reopened, as stored. */
  saved?: unknown
  /** The query part of the URL hash, without '?'. */
  query: string
  projectServiceTempC?: TemperatureRange
}

/** Where a tool screen starts: a reopened revision, else a shared link, else a fresh calculation. */
export function startingInputs<Inputs>(codec: ToolInputsCodec<Inputs>, { saved, query, projectServiceTempC }: StartingPoint): Inputs {
  if (saved !== undefined) return codec.fromSaved(saved)
  if (query !== '') return codec.decode(query)
  return codec.fresh(projectServiceTempC)
}
