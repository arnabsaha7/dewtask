/**
 * TaskNest persistence boundary.
 * The UI talks to this interface rather than a specific database. The current
 * browser driver uses IndexedDB; native desktop/mobile drivers can be registered
 * without changing hooks or components.
 */
export type StorageKey =
  | 'tasknest_tasks'
  | 'tasknest_categories'
  | 'tasknest_tags'
  | 'tasknest_workspaces'
  | 'tasknest_settings'
  | 'tasknest_notifications'

export interface StorageDriver {
  get<T>(key: StorageKey): Promise<T | null>
  set<T>(key: StorageKey, value: T): Promise<void>
  remove(key: StorageKey): Promise<void>
  clear(): Promise<void>
  replaceAll?(values: Record<StorageKey, unknown>): Promise<void>
}

const DB_NAME = 'tasknest-local'
const DB_VERSION = 1
const STORE_NAME = 'records'
const STORAGE_KEYS: StorageKey[] = [
  // Parent records must be migrated before dependent records in SQLite.
  'tasknest_workspaces',
  'tasknest_categories',
  'tasknest_tags',
  'tasknest_tasks',
  'tasknest_settings',
  'tasknest_notifications',
]

let databasePromise: Promise<IDBDatabase> | null = null
let migrationPromise: Promise<void> | null = null
let activeDriver: StorageDriver | null = null

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available in this environment.'))
  }
  if (!databasePromise) {
    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('Unable to open local database.'))
      request.onblocked = () => reject(new Error('The TaskNest database upgrade is blocked by another tab.'))
    }).catch((error) => {
      databasePromise = null
      throw error
    })
  }
  return databasePromise!
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Database request failed.'))
  })
}

const indexedDbDriver: StorageDriver = {
  async get<T>(key: StorageKey): Promise<T | null> {
    const db = await openDatabase()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const result = await requestResult(tx.objectStore(STORE_NAME).get(key))
    return result === undefined ? null : result as T
  },
  async set<T>(key: StorageKey, value: T): Promise<void> {
    const db = await openDatabase()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(value, key)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('Unable to save local data.'))
      tx.onabort = () => reject(tx.error ?? new Error('Saving local data was cancelled.'))
    })
  },
  async remove(key: StorageKey): Promise<void> {
    const db = await openDatabase()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(key)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('Unable to remove local data.'))
      tx.onabort = () => reject(tx.error ?? new Error('Removing local data was cancelled.'))
    })
  },
  async clear(): Promise<void> {
    const db = await openDatabase()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('Unable to clear local data.'))
      tx.onabort = () => reject(tx.error ?? new Error('Clearing local data was cancelled.'))
    })
  },
}

/** Register a platform-specific driver (Tauri or Capacitor SQLite) before app startup. */
export function configureStorageDriver(driver: StorageDriver): void {
  activeDriver = driver
  migrationPromise = null
}

function getDriver(): StorageDriver {
  return activeDriver ?? indexedDbDriver
}

/** One-time, non-destructive migration from the previous localStorage format. */
export async function initializeStorage(): Promise<void> {
  if (!migrationPromise) {
    migrationPromise = (async () => {
      const driver = getDriver()
      for (const key of STORAGE_KEYS) {
        if (await driver.get(key) !== null) continue
        let legacy: string | null = null
        try { legacy = localStorage.getItem(key) } catch { /* private browsing/storage disabled */ }
        if (legacy !== null) {
          try { await driver.set(key, JSON.parse(legacy)) }
          catch (error) { console.error(`Could not migrate ${key}; the original data was left untouched.`, error) }
        }
      }
    })().catch((error) => {
      migrationPromise = null
      throw error
    })
  }
  await migrationPromise
}

export async function readStorage<T>(key: StorageKey): Promise<T | null> {
  await initializeStorage()
  return getDriver().get<T>(key)
}

export async function writeStorage<T>(key: StorageKey, value: T): Promise<void> {
  await initializeStorage()
  await getDriver().set(key, value)
}

export async function removeStorage(key: StorageKey): Promise<void> {
  await initializeStorage()
  await getDriver().remove(key)
}

export async function clearStorage(): Promise<void> {
  await initializeStorage()
  await getDriver().clear()
  try { for (const key of STORAGE_KEYS) localStorage.removeItem(key) } catch { /* ignore */ }
  migrationPromise = Promise.resolve()
}

export async function readAllStorage(): Promise<Record<StorageKey, unknown>> {
  await initializeStorage()
  const driver = getDriver()
  const entries = await Promise.all(STORAGE_KEYS.map(async (key) => [key, await driver.get(key)] as const))
  return Object.fromEntries(entries) as Record<StorageKey, unknown>
}

export async function replaceAllStorage(values: Record<StorageKey, unknown>): Promise<void> {
  await initializeStorage()
  const driver = getDriver()
  if (driver.replaceAll) {
    await driver.replaceAll(values)
  } else {
    for (const key of STORAGE_KEYS) await driver.set(key, values[key])
  }
  try { for (const key of STORAGE_KEYS) localStorage.removeItem(key) } catch { /* ignore */ }
}

export async function storageRecordExists(key: StorageKey): Promise<boolean> {
  return (await readStorage(key)) !== null
}
