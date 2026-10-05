/**
 * Projects: public API. A project holds parts, design targets, a team, the
 * saved revisions of each tool's calculation per part, and design decisions.
 * commands.ts changes state (pure), queries.ts reads it, storage.ts keeps it
 * in the browser, seed.ts provides the demo data shown on first run.
 */
export type * from './model'
export type { SnapshotFigure, ToolId, ToolSnapshot } from './revision'
export {
  approveDecision, createProject, recordDecision, saveRevision, setActiveProject, setProjectStage, updateProject,
  type DecisionDraft, type ProjectDraft, type SaveRevisionRequest,
} from './commands'
export { nextCalculationId, nextDecisionId, nextProjectCode } from './identifiers'
export {
  approverOf, currentRevision, decisionsBasedOn, figureChanges, figureText, findCalculation, findRevision,
  isSuperseded, materialUsage, partOf, previousRevision, projectStats, revisionsNewestFirst,
  type FigureChange, type ProjectStats, type ProjectStatus, type RevisionInContext,
} from './queries'
export { revLetter } from './revLetters'
export { seedProjects } from './seed'
export { loadProjects, saveProjects, STORAGE_KEY, type KeyValueStore, type LoadedProjects } from './storage'
export { TOOL_IDS, TOOLS } from './tools'
