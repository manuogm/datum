// Runs the stacking-sequence optimiser off the main thread: one request in,
// its result out. Searches with moments can take seconds; the screen stays
// responsive and can stop the search by terminating the worker.
import { optimiseLayup, type OptimiseInput } from '../../optimise'

// The DOM typings describe a window; a dedicated worker posts back without a target origin.
const scope = self as unknown as Worker

scope.onmessage = (event: MessageEvent<OptimiseInput>) => {
  scope.postMessage(optimiseLayup(event.data))
}
