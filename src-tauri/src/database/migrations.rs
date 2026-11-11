use rusqlite::{params, Connection, Transaction};

const ACCOUNT_SCOPED_TABLES: [&str; 4] = ["workspaces", "categories", "tags", "tasks"];

/// Runs all migrations that have not yet been applied.
///
/// v3: account and device identity, account ownership, initial sync tables.
/// v4: HLC clock state and durable deletion tombstones.
pub(super) fn run(connection: &Connection) -> rusqlite::Result<()> {
    let current_version: Option<i64> =
        connection.query_row("SELECT MAX(version) FROM schema_migrations", [], |row| {
            row.get(0)
        })?;

    let mut version = current_version.unwrap_or(0);

    if version < 3 {
        let tx = connection.unchecked_transaction()?;

        migrate_to_v3(&tx)?;

        tx.execute(
            "INSERT OR IGNORE INTO schema_migrations(version)
             VALUES (3)",
            [],
        )?;

        tx.commit()?;
        version = 3;
    }

    if version < 4 {
        let tx = connection.unchecked_transaction()?;

        migrate_to_v4(&tx)?;

        tx.execute(
            "INSERT OR IGNORE INTO schema_migrations(version)
             VALUES (4)",
            [],
        )?;

        tx.commit()?;
    }

    Ok(())
}

fn migrate_to_v3(tx: &Transaction<'_>) -> rusqlite::Result<()> {
    tx.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY NOT NULL,
            provider TEXT NOT NULL,
            provider_user_id TEXT,
            email TEXT,
            display_name TEXT,
            is_local INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (
                strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            ),
            updated_at TEXT NOT NULL DEFAULT (
                strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            )
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_local_singleton
            ON accounts(provider)
            WHERE provider = 'local';

        CREATE TABLE IF NOT EXISTS devices (
            id TEXT PRIMARY KEY NOT NULL,
            account_id TEXT NOT NULL,
            device_name TEXT NOT NULL,
            platform TEXT NOT NULL,
            last_seen_at TEXT,
            created_at TEXT NOT NULL DEFAULT (
                strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            ),
            FOREIGN KEY(account_id)
                REFERENCES accounts(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_devices_account
            ON devices(account_id);

        CREATE TABLE IF NOT EXISTS sync_changes (
            operation_id TEXT PRIMARY KEY NOT NULL,
            account_id TEXT NOT NULL,
            device_id TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            operation TEXT NOT NULL
                CHECK(operation IN ('upsert', 'delete', 'restore')),
            payload_json TEXT,
            hlc_wall_time INTEGER NOT NULL,
            hlc_counter INTEGER NOT NULL,
            hlc_device_id TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (
                strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            ),
            synced_at TEXT,
            attempts INTEGER NOT NULL DEFAULT 0,
            last_error TEXT,
            FOREIGN KEY(account_id)
                REFERENCES accounts(id) ON DELETE CASCADE,
            FOREIGN KEY(device_id)
                REFERENCES devices(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_sync_changes_pending
            ON sync_changes(account_id, synced_at, created_at);

        CREATE INDEX IF NOT EXISTS idx_sync_changes_entity
            ON sync_changes(account_id, entity_type, entity_id);

        CREATE TABLE IF NOT EXISTS sync_state (
            account_id TEXT NOT NULL,
            device_id TEXT NOT NULL,
            remote_cursor TEXT,
            last_upload_at TEXT,
            last_download_at TEXT,
            last_success_at TEXT,
            last_error TEXT,
            status TEXT NOT NULL DEFAULT 'idle',
            updated_at TEXT NOT NULL DEFAULT (
                strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            ),
            PRIMARY KEY(account_id, device_id),
            FOREIGN KEY(account_id)
                REFERENCES accounts(id) ON DELETE CASCADE,
            FOREIGN KEY(device_id)
                REFERENCES devices(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS sync_field_versions (
            account_id TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            field_name TEXT NOT NULL,
            hlc_wall_time INTEGER NOT NULL,
            hlc_counter INTEGER NOT NULL,
            hlc_device_id TEXT NOT NULL,
            PRIMARY KEY(
                account_id,
                entity_type,
                entity_id,
                field_name
            ),
            FOREIGN KEY(account_id)
                REFERENCES accounts(id) ON DELETE CASCADE
        );
        "#,
    )?;

    for table in ACCOUNT_SCOPED_TABLES {
        add_column_if_missing(tx, table, "account_id", "TEXT")?;
        add_column_if_missing(tx, table, "deleted_at", "TEXT")?;

        add_column_if_missing(tx, table, "hlc_wall_time", "INTEGER NOT NULL DEFAULT 0")?;

        add_column_if_missing(tx, table, "hlc_counter", "INTEGER NOT NULL DEFAULT 0")?;

        add_column_if_missing(tx, table, "hlc_device_id", "TEXT")?;

        add_column_if_missing(tx, table, "sync_status", "TEXT NOT NULL DEFAULT 'local'")?;
    }

    // Settings and notification history remain local application data.
    add_column_if_missing(tx, "app_settings", "account_id", "TEXT")?;

    tx.execute(
        "INSERT OR IGNORE INTO accounts(id, provider, is_local)
         VALUES(
            'local-' || lower(hex(randomblob(16))),
            'local',
            1
         )",
        [],
    )?;

    let local_account_id: String = tx.query_row(
        "SELECT id FROM accounts
         WHERE is_local = 1
         LIMIT 1",
        [],
        |row| row.get(0),
    )?;

    tx.execute(
        "INSERT OR IGNORE INTO devices(
            id, account_id, device_name, platform
         )
         VALUES(
            'device-' || lower(hex(randomblob(16))),
            ?1,
            'This device',
            ?2
         )",
        params![local_account_id, std::env::consts::OS],
    )?;

    let local_device_id: String = tx.query_row(
        "SELECT id FROM devices
         WHERE account_id = ?1
         ORDER BY created_at
         LIMIT 1",
        params![local_account_id],
        |row| row.get(0),
    )?;

    for table in ACCOUNT_SCOPED_TABLES {
        let sql = format!(
            "UPDATE {table}
             SET account_id = ?1,
                 hlc_device_id = COALESCE(hlc_device_id, ?2),
                 sync_status = COALESCE(sync_status, 'local')
             WHERE account_id IS NULL"
        );

        tx.execute(&sql, params![local_account_id, local_device_id])?;

        tx.execute_batch(&format!(
            "CREATE INDEX IF NOT EXISTS idx_{table}_account
             ON {table}(account_id);"
        ))?;

        let trigger_name = format!("trg_{table}_assign_local_account");

        let trigger_sql = format!(
            "CREATE TRIGGER IF NOT EXISTS {trigger_name}
             AFTER INSERT ON {table}
             WHEN NEW.account_id IS NULL
             BEGIN
                 UPDATE {table}
                 SET account_id = (
                     SELECT id FROM accounts
                     WHERE is_local = 1
                     LIMIT 1
                 ),
                 hlc_device_id = COALESCE(
                     NEW.hlc_device_id,
                     '{local_device_id}'
                 )
                 WHERE id = NEW.id;
             END;"
        );

        tx.execute_batch(&trigger_sql)?;
    }

    tx.execute(
        "UPDATE app_settings
         SET account_id = ?1
         WHERE account_id IS NULL",
        params![local_account_id],
    )?;

    tx.execute(
        "INSERT OR IGNORE INTO sync_state(
            account_id, device_id, status
         )
         VALUES(?1, ?2, 'local-only')",
        params![local_account_id, local_device_id],
    )?;

    Ok(())
}

fn migrate_to_v4(tx: &Transaction<'_>) -> rusqlite::Result<()> {
    tx.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS sync_clock (
            account_id TEXT NOT NULL,
            device_id TEXT NOT NULL,
            wall_time INTEGER NOT NULL,
            counter INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL DEFAULT (
                strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            ),
            PRIMARY KEY(account_id, device_id),
            FOREIGN KEY(account_id)
                REFERENCES accounts(id) ON DELETE CASCADE,
            FOREIGN KEY(device_id)
                REFERENCES devices(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS sync_tombstones (
            account_id TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            operation TEXT NOT NULL
                CHECK(operation IN ('delete', 'restore')),
            changed_at TEXT NOT NULL DEFAULT (
                strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            ),
            hlc_wall_time INTEGER NOT NULL,
            hlc_counter INTEGER NOT NULL,
            hlc_device_id TEXT NOT NULL,
            PRIMARY KEY(account_id, entity_type, entity_id),
            FOREIGN KEY(account_id)
                REFERENCES accounts(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_sync_tombstones_clock
            ON sync_tombstones(
                account_id,
                hlc_wall_time,
                hlc_counter,
                hlc_device_id
            );
        "#,
    )?;

    // Every local account/device pair receives an initial clock.
    tx.execute(
        "INSERT OR IGNORE INTO sync_clock(
            account_id,
            device_id,
            wall_time,
            counter
         )
         SELECT a.id, d.id, 0, 0
         FROM accounts a
         INNER JOIN devices d ON d.account_id = a.id
         WHERE a.is_local = 1",
        [],
    )?;

    return Ok(());
}

fn add_column_if_missing(
    tx: &Transaction<'_>,
    table: &str,
    column: &str,
    definition: &str,
) -> rusqlite::Result<()> {
    let column_exists = {
        let mut statement = tx.prepare(&format!("PRAGMA table_info({table})"))?;

        let columns = statement.query_map([], |row| row.get::<_, String>(1))?;

        let mut found = false;

        for existing in columns {
            if existing? == column {
                found = true;
                break;
            }
        }

        found
    };

    if column_exists {
        return Ok(());
    }

    tx.execute_batch(&format!(
        "ALTER TABLE {table} ADD COLUMN {column} {definition}"
    ))
}
