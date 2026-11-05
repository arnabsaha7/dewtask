import { isTauri } from '@tauri-apps/api/core'
import { Capacitor } from '@capacitor/core'
import { configureStorageDriver, initializeStorage } from './storage'

/** Select desktop or mobile native SQLite while retaining IndexedDB in browsers. */
export async function initializePlatformStorage(): Promise<void> {
  if (isTauri()) {
    const { tauriSqliteStorage } = await import('./tauriSqliteStorage')
    configureStorageDriver(tauriSqliteStorage)
  } else if (Capacitor.isNativePlatform()) {
    const { capacitorSqliteStorage } = await import('./capacitorSqliteStorage')
    configureStorageDriver(capacitorSqliteStorage)
  }

  await initializeStorage()
}
