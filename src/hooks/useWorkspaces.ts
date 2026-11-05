import type { Workspace } from '../types'
import { initialWorkspaces } from '../data/initialData'
import { usePersistentValue } from './usePersistentValue'

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = usePersistentValue<Workspace[]>('tasknest_workspaces', initialWorkspaces)
  return { workspaces, setWorkspaces }
}
