// The optimiser run behind the panel: a Web Worker per run, the time it has
// been searching, and its result tagged with the request it answers, so the
// panel can tell when the inputs have moved on. Cancel terminates the worker.
import { useCallback, useEffect, useRef, useState } from 'react'
import { fail, type Result } from '../../../../core/result'
import type { LayupOptimisation, OptimiseInput } from '../../optimise'

export type OptimiserRun =
  | { readonly status: 'idle' }
  | { readonly status: 'running'; readonly request: string; readonly seconds: number }
  | { readonly status: 'done'; readonly request: string; readonly seconds: number; readonly result: Result<LayupOptimisation> }

const TICK_MS = 100

/** A request as a key: two runs with equal keys give the same result. */
export const requestKey = (input: OptimiseInput) => JSON.stringify(input)

export function useOptimiser() {
  const [run, setRun] = useState<OptimiserRun>({ status: 'idle' })
  const worker = useRef<Worker | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const stop = useCallback(() => {
    worker.current?.terminate()
    worker.current = null
    window.clearInterval(timer.current)
  }, [])

  const start = useCallback((input: OptimiseInput) => {
    stop()
    const request = requestKey(input)
    const startedAt = performance.now()
    const seconds = () => (performance.now() - startedAt) / 1000
    const next = new Worker(new URL('./optimise.worker.ts', import.meta.url), { type: 'module' })
    next.onmessage = (event: MessageEvent<Result<LayupOptimisation>>) => {
      stop()
      setRun({ status: 'done', request, seconds: seconds(), result: event.data })
    }
    next.onerror = () => {
      stop()
      setRun({ status: 'done', request, seconds: seconds(), result: fail('The optimiser stopped unexpectedly.') })
    }
    next.postMessage(input)
    worker.current = next
    setRun({ status: 'running', request, seconds: 0 })
    timer.current = window.setInterval(() => setRun((current) => (current.status === 'running' ? { ...current, seconds: seconds() } : current)), TICK_MS)
  }, [stop])

  const cancel = useCallback(() => {
    stop()
    setRun({ status: 'idle' })
  }, [stop])

  useEffect(() => stop, [stop])

  return { run, start, cancel }
}
