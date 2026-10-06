// useLibrary: the library for screens, plus the actions that change it. Each
// action stamps the time and hands out new ids, and returns either the
// outcome (the new item's id) or a plain-English error to show in the dialog.
import { useSyncExternalStore } from 'react'
import {
  createCalculation,
  createFolder,
  deleteCalculation,
  deleteFolder,
  duplicateCalculation,
  moveCalculation,
  moveFolder,
  refreshSummary,
  renameCalculation,
  renameFolder,
  updateCalculation,
  type CalculationSummary,
  type ToolId,
} from '../../core/library'
import { ok, type Result } from '../../core/result'
import { localTimestamp } from '../format/timestamp'
import { applyChange, getSnapshot, subscribe } from './libraryStore'
import { newId } from './newId'

type Done = Result<null>

function done(result: Result<unknown>): Done {
  return result.ok ? ok(null) : result
}

/** Runs a command that creates something under a fresh id; returns that id. */
function create(command: (id: string) => Parameters<typeof applyChange>[0]): Result<string> {
  const id = newId(getSnapshot().state)
  const result = applyChange(command(id))
  return result.ok ? ok(id) : result
}

export const libraryActions = {
  createFolder(name: string, parentId: string | null): Result<string> {
    return create((id) => (library) => createFolder(library, { id, name, parentId }, localTimestamp()))
  },
  renameFolder(id: string, name: string): Done {
    return done(applyChange((library) => renameFolder(library, id, name)))
  },
  moveFolder(id: string, parentId: string | null): Done {
    return done(applyChange((library) => moveFolder(library, id, parentId)))
  },
  deleteFolder(id: string): Done {
    return done(applyChange((library) => deleteFolder(library, id)))
  },

  /** A new calculation, stored at once with the tool's starting inputs and their summary. */
  createCalculation(
    calculation: { tool: ToolId; name: string; folderId: string | null; inputs: unknown; summary: CalculationSummary | null },
  ): Result<string> {
    return create((id) => (library) => createCalculation(library, { id, ...calculation }, localTimestamp()))
  },
  renameCalculation(id: string, name: string): Done {
    return done(applyChange((library) => renameCalculation(library, id, name)))
  },
  duplicateCalculation(id: string): Result<string> {
    return create((copyId) => (library) => duplicateCalculation(library, id, copyId, localTimestamp()))
  },
  moveCalculation(id: string, folderId: string | null): Done {
    return done(applyChange((library) => moveCalculation(library, id, folderId)))
  },
  deleteCalculation(id: string): Done {
    return done(applyChange((library) => deleteCalculation(library, id)))
  },

  /** Save from a tool screen: the inputs on screen and the result they give. */
  saveCalculation(id: string, inputs: unknown, summary: CalculationSummary | null): Done {
    return done(applyChange((library) => updateCalculation(library, id, { inputs, summary }, localTimestamp())))
  },
  /** A tool's fresh summary for unchanged inputs; not an edit. */
  refreshSummary(id: string, summary: CalculationSummary | null): Done {
    return done(applyChange((library) => refreshSummary(library, id, summary)))
  },
}

export function useLibrary() {
  const { state, problem } = useSyncExternalStore(subscribe, getSnapshot)
  return { library: state, problem }
}
