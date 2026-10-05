// "Export project dossier": downloads the whole project (targets, parts,
// every revision with its inputs, decisions) as a JSON file the team can
// archive or attach to a design review.
import type { Project } from '../../../core/projects'

export function exportDossier(project: Project): void {
  const file = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = `${project.id} ${project.name}.json`
  link.click()
  URL.revokeObjectURL(url)
}
