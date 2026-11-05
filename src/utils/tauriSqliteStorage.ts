import { invoke } from '@tauri-apps/api/core'
import type { StorageDriver, StorageKey } from './storage'

/** Rust/SQLite-backed storage driver used by the TaskNest desktop app. */
export const tauriSqliteStorage: StorageDriver = {
  async get<T>(key: StorageKey): Promise<T | null> {
    const raw = await invoke<string | null>('storage_get', { key })
    return raw === null ? null : JSON.parse(raw) as T
  },

  async set<T>(key: StorageKey, value: T): Promise<void> {
    await invoke('storage_set', { key, value: JSON.stringify(value) })
  },

  async remove(key: StorageKey): Promise<void> {
    await invoke('storage_remove', { key })
  },

  async clear(): Promise<void> {
    await invoke('storage_clear')
  },

  async replaceAll(values): Promise<void> {
    const serialized = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, JSON.stringify(value)]),
    )
    await invoke('storage_replace_all', { values: serialized })
  },
}
