// How a tool screen's inputs travel: the query of the URL hash carries them
// as a shareable link, a project revision stores them, and a fresh
// calculation starts from defaults with the active project's design targets
// (service temperatures, minimum reserve factor). Each tool supplies a codec
// for its own inputs.
import type { DesignTargets } from '../../core/projects'

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
  /** A fresh calculation, with the active project's design targets when there is one. */
  fresh: (projectTargets?: DesignTargets) => Inputs
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
  projectTargets?: DesignTargets
}

/** A project's service temperature range, as the tools hold it. */
export function serviceTempOf(targets: DesignTargets): TemperatureRange {
  return { minC: targets.serviceTempMinC, maxC: targets.serviceTempMaxC }
}

/** Where a tool screen starts: a reopened revision, else a shared link, else a fresh calculation. */
export function startingInputs<Inputs>(codec: ToolInputsCodec<Inputs>, { saved, query, projectTargets }: StartingPoint): Inputs {
  if (saved !== undefined) return codec.fromSaved(saved)
  if (query !== '') return codec.decode(query)
  return codec.fresh(projectTargets)
}
