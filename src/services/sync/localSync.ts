import { invoke, isTauri } from '@tauri-apps/api/core'

import type {
  HybridLogicalClock,
  SyncChange,
  SyncQueueSummary,
} from '../../types/sync'

function requireDesktopSync(): void {
  if (!isTauri()) {
    throw new Error(
      'The local sync queue is not available on this platform yet. ' +
        'Cross-platform sync will be enabled after the mobile storage ' +
        'adapter supports transactional change tracking.',
    )
  }
}

/** Advances the local clock after receiving a remote HLC value. */
export async function observeRemoteClock(
  remoteClock: HybridLogicalClock,
): Promise<HybridLogicalClock> {
  requireDesktopSync()

  return invoke<HybridLogicalClock>(
    'sync_observe_remote_clock',
    {
      wallTime: remoteClock.wallTime,
      counter: remoteClock.counter,
    },
  )
}

/** Returns pending operations in HLC order. */
export async function getPendingSyncChanges(
  limit = 100,
): Promise<SyncChange[]> {
  requireDesktopSync()

  const safeLimit = Math.max(
    1,
    Math.min(500, Math.floor(limit)),
  )

  return invoke<SyncChange[]>(
    'sync_get_pending_changes',
    { limit: safeLimit },
  )
}

/** Returns the current local synchronization status. */
export async function getSyncQueueSummary(): Promise<SyncQueueSummary> {
  requireDesktopSync()

  return invoke<SyncQueueSummary>(
    'sync_get_queue_summary',
  )
}

/**
 * Acknowledge operations only after the remote server confirms
 * that the corresponding upload batch was committed.
 */
export async function markSyncChangesSynced(
  operationIds: string[],
): Promise<void> {
  requireDesktopSync()

  if (operationIds.length === 0) {
    return
  }

  await invoke(
    'sync_mark_changes_synced',
    { operationIds },
  )
}

/** Records a failed upload without removing the pending operation. */
export async function recordSyncChangeFailure(
  operationId: string,
  error: unknown,
): Promise<void> {
  requireDesktopSync()

  const message =
    error instanceof Error
      ? error.message
      : String(error)

  await invoke(
    'sync_record_change_failure',
    {
      operationId,
      error: message,
    },
  )
}