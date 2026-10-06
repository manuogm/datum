/**
 * Library: public API. Folders (nested like a file directory) hold
 * calculations, each one tool's inputs plus a summary of its result.
 * commands.ts changes the library (pure), queries.ts reads it, storage.ts
 * keeps it in the browser, seed.ts provides the Examples folder of a first visit.
 */
export type * from './model'
export {
  createCalculation, createFolder, deleteCalculation, deleteFolder, duplicateCalculation, MAX_NAME_LENGTH,
  moveCalculation, moveFolder, refreshSummary, renameCalculation, renameFolder, updateCalculation,
} from './commands'
export {
  calculationsIn, copyName, defaultCalculationName, findCalculation, findFolder, folderAndBelow, folderContents,
  folderPath, subfolders, summaryOf,
} from './queries'
export { EXAMPLE_SUMMARIES, EXAMPLES_FOLDER_ID, seedLibrary } from './seed'
export { loadLibrary, saveLibrary, STORAGE_KEY, type KeyValueStore, type LoadedLibrary } from './storage'
export { TOOL_IDS, TOOLS } from './tools'
