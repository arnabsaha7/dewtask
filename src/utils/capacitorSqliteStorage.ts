import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite'
import type { StorageDriver, StorageKey } from './storage'

const DATABASE_NAME = 'tasknest'
const DATABASE_VERSION = 1

let connectionPromise: Promise<SQLiteDBConnection> | null = null

async function getDatabase(): Promise<SQLiteDBConnection> {
  if (!connectionPromise) {
    connectionPromise = (async () => {
      const sqlite = new SQLiteConnection(CapacitorSQLite)
      const consistency = await sqlite.checkConnectionsConsistency()
      const existing = await sqlite.isConnection(DATABASE_NAME, false)

      const db = consistency.result && existing.result
        ? await sqlite.retrieveConnection(DATABASE_NAME, false)
        : await sqlite.createConnection(
            DATABASE_NAME,
            false,
            'no-encryption',
            DATABASE_VERSION,
            false,
          )

      await db.open()
      await db.execute(`
        CREATE TABLE IF NOT EXISTS app_storage (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL,
          updated_at INTEGER NOT NULL DEFAULT 0
        );
      `)
      return db
    })().catch((error) => {
      connectionPromise = null
      throw error
    })
  }

  return connectionPromise
}

/** Native SQLite implementation of the shared TaskNest key/value storage API. */
export const capacitorSqliteStorage: StorageDriver = {
  async get<T>(key: StorageKey): Promise<T | null> {
    const db = await getDatabase()
    const result = await db.query(
      'SELECT value FROM app_storage WHERE key = ? LIMIT 1',
      [key],
    )
    const rawValue = result.values?.[0]?.value
    return typeof rawValue === 'string' ? JSON.parse(rawValue) as T : null
  },

  async set<T>(key: StorageKey, value: T): Promise<void> {
    const db = await getDatabase()
    await db.run(
      `INSERT OR REPLACE INTO app_storage (key, value, updated_at)
       VALUES (?, ?, ?)`,
      [key, JSON.stringify(value), Date.now()],
    )
  },

  async remove(key: StorageKey): Promise<void> {
    const db = await getDatabase()
    await db.run('DELETE FROM app_storage WHERE key = ?', [key])
  },

  async clear(): Promise<void> {
    const db = await getDatabase()
    await db.run('DELETE FROM app_storage')
  },
}
