/** Identity provider used by a TaskNest account. */
export type AccountProvider = 'local' | 'supabase'

/** Current lifecycle state of the local-to-cloud synchronization pipeline. */
export type SyncStatus =
  | 'local-only'
  | 'idle'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'error'

/** Hybrid Logical Clock value used to order changes across devices. */
export interface HybridLogicalClock {
  wallTime: number
  counter: number
  deviceId: string
}

export interface TaskNestAccount {
  id: string
  provider: AccountProvider
  providerUserId?: string | null
  email?: string | null
  displayName?: string | null
  isLocal: boolean
  createdAt: string
  updatedAt: string
}

export interface TaskNestDevice {
  id: string
  accountId: string
  deviceName: string
  platform: string
  lastSeenAt?: string | null
  createdAt: string
}

export type SyncEntityType =
  | 'workspace'
  | 'category'
  | 'tag'
  | 'task'

export type SyncOperationType =
  | 'upsert'
  | 'delete'
  | 'restore'

/** Durable local outbox item. */
export interface SyncChange {
  operationId: string
  accountId: string
  deviceId: string
  entityType: SyncEntityType
  entityId: string
  operation: SyncOperationType
  payload: Record<string, unknown> | null
  clock: HybridLogicalClock
  createdAt: string
  syncedAt?: string | null
  attempts: number
  lastError?: string | null
}

/** Per-device synchronization state. */
export interface DeviceSyncState {
  accountId: string
  deviceId: string
  remoteCursor?: string | null
  lastUploadAt?: string | null
  lastDownloadAt?: string | null
  lastSuccessAt?: string | null
  lastError?: string | null
  status: SyncStatus
  updatedAt: string
}

/** Local outbox and latest synchronization summary. */
export interface SyncQueueSummary {
  accountId: string
  deviceId: string
  pendingCount: number
  lastUploadAt?: string | null
  lastDownloadAt?: string | null
  lastSuccessAt?: string | null
  lastError?: string | null
  status: SyncStatus
}