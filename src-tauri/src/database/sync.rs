use rusqlite::{params, OptionalExtension, Transaction};
use serde::Serialize;
use serde_json::Value;
use std::collections::{BTreeSet, HashMap};
use std::time::{SystemTime, UNIX_EPOCH};

use super::Database;

const ENTITY_TABLES: [(&str, &str); 4] = [
    ("workspace", "workspaces"),
    ("category", "categories"),
    ("tag", "tags"),
    ("task", "tasks"),
];

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncClock {
    pub wall_time: i64,
    pub counter: i64,
    pub device_id: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncChange {
    pub operation_id: String,
    pub account_id: String,
    pub device_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub operation: String,
    pub payload: Option<Value>,
    pub clock: SyncClock,
    pub created_at: String,
    pub synced_at: Option<String>,
    pub attempts: i64,
    pub last_error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncQueueSummary {
    pub account_id: String,
    pub device_id: String,
    pub pending_count: i64,
    pub last_upload_at: Option<String>,
    pub last_download_at: Option<String>,
    pub last_success_at: Option<String>,
    pub last_error: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone)]
pub(super) struct EntityRecord {
    account_id: String,
    data_json: String,
}

pub(super) type SyncSnapshot = HashMap<(String, String), EntityRecord>;

/// Captures every syncable entity, including entities that may be removed by
/// a foreign-key cascade during the upcoming write.
pub(super) fn capture_snapshot(tx: &Transaction<'_>) -> rusqlite::Result<SyncSnapshot> {
    let mut snapshot = SyncSnapshot::new();

    for (entity_type, table) in ENTITY_TABLES {
        let sql = format!("SELECT id, account_id, data_json FROM {table}");

        let mut statement = tx.prepare(&sql)?;
        let rows = statement.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<String>>(1)?.unwrap_or_default(),
                row.get::<_, String>(2)?,
            ))
        })?;

        for row in rows {
            let (id, account_id, data_json) = row?;

            snapshot.insert(
                (entity_type.to_string(), id),
                EntityRecord {
                    account_id,
                    data_json,
                },
            );
        }
    }

    Ok(snapshot)
}

/// Records changes in the same transaction as the entity write.
pub(super) fn record_changes(tx: &Transaction<'_>, before: SyncSnapshot) -> rusqlite::Result<()> {
    let after = capture_snapshot(tx)?;

    let mut key_set = BTreeSet::new();
    key_set.extend(before.keys().cloned());
    key_set.extend(after.keys().cloned());

    let mut keys: Vec<(String, String)> = key_set.into_iter().collect();

    if keys.is_empty() {
        return Ok(());
    }

    // Parent records are emitted first for upserts and last for deletes.
    keys.sort_by_key(|key| {
        let deleting = !after.contains_key(key);

        let rank = match (deleting, key.0.as_str()) {
            (false, "workspace") => 0,
            (false, "category") => 1,
            (false, "tag") => 2,
            (false, "task") => 3,

            (true, "task") => 0,
            (true, "category") => 1,
            (true, "tag") => 2,
            (true, "workspace") => 3,

            _ => 4,
        };

        (rank, key.0.clone(), key.1.clone())
    });

    let (local_account_id, local_device_id): (String, String) = tx.query_row(
        "SELECT a.id, d.id
             FROM accounts a
             INNER JOIN devices d ON d.account_id = a.id
             WHERE a.is_local = 1
             ORDER BY d.created_at
             LIMIT 1",
        [],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )?;

    for key in keys {
        let old = before.get(&key);
        let new = after.get(&key);

        let old_json = old.map(|record| record.data_json.as_str());
        let new_json = new.map(|record| record.data_json.as_str());

        let old_account_id = old.map(|record| record.account_id.as_str());
        let new_account_id = new.map(|record| record.account_id.as_str());

        if old_json == new_json && old_account_id == new_account_id {
            continue;
        }

        let entity_type = &key.0;
        let entity_id = &key.1;

        let account_id = new
            .map(|record| record.account_id.as_str())
            .filter(|value| !value.is_empty())
            .or_else(|| {
                old.map(|record| record.account_id.as_str())
                    .filter(|value| !value.is_empty())
            })
            .unwrap_or(local_account_id.as_str())
            .to_string();

        let previous_tombstone: Option<String> = tx
            .query_row(
                "SELECT operation FROM sync_tombstones
                 WHERE account_id = ?1
                   AND entity_type = ?2
                   AND entity_id = ?3",
                params![account_id, entity_type, entity_id],
                |row| row.get(0),
            )
            .optional()?;

        let operation = if new.is_none() {
            "delete"
        } else if previous_tombstone.as_deref() == Some("delete") {
            "restore"
        } else {
            "upsert"
        };

        let clock = next_clock(tx, &account_id, &local_device_id)?;

        let payload_json = new.map(|record| record.data_json.clone());

        let operation_id: String =
            tx.query_row("SELECT 'op-' || lower(hex(randomblob(16)))", [], |row| {
                row.get(0)
            })?;

        tx.execute(
            "INSERT INTO sync_changes(
                operation_id,
                account_id,
                device_id,
                entity_type,
                entity_id,
                operation,
                payload_json,
                hlc_wall_time,
                hlc_counter,
                hlc_device_id
             )
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                operation_id,
                account_id,
                local_device_id,
                entity_type,
                entity_id,
                operation,
                payload_json,
                clock.wall_time,
                clock.counter,
                clock.device_id,
            ],
        )?;

        // Keep the latest delete/restore marker independently of the entity.
        if operation == "delete" || operation == "restore" {
            tx.execute(
                "INSERT INTO sync_tombstones(
                    account_id,
                    entity_type,
                    entity_id,
                    operation,
                    changed_at,
                    hlc_wall_time,
                    hlc_counter,
                    hlc_device_id
                 )
                 VALUES (
                    ?1, ?2, ?3, ?4,
                    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                    ?5, ?6, ?7
                 )
                 ON CONFLICT(account_id, entity_type, entity_id)
                 DO UPDATE SET
                    operation = excluded.operation,
                    changed_at = excluded.changed_at,
                    hlc_wall_time = excluded.hlc_wall_time,
                    hlc_counter = excluded.hlc_counter,
                    hlc_device_id = excluded.hlc_device_id",
                params![
                    account_id,
                    entity_type,
                    entity_id,
                    operation,
                    clock.wall_time,
                    clock.counter,
                    clock.device_id,
                ],
            )?;
        }

        if let Some(record) = new {
            let table = table_for_entity(entity_type)?;

            let sql = format!(
                "UPDATE {table}
                 SET hlc_wall_time = ?1,
                     hlc_counter = ?2,
                     hlc_device_id = ?3,
                     sync_status = 'pending',
                     deleted_at = NULL
                 WHERE id = ?4"
            );

            tx.execute(
                &sql,
                params![clock.wall_time, clock.counter, clock.device_id, entity_id],
            )?;

            record_field_versions(
                tx,
                &account_id,
                entity_type,
                entity_id,
                old.and_then(|value| serde_json::from_str::<Value>(&value.data_json).ok()),
                serde_json::from_str::<Value>(&record.data_json).ok(),
                &clock,
            )?;
        } else {
            record_field_version(tx, &account_id, entity_type, entity_id, "__deleted", &clock)?;
        }
    }

    Ok(())
}

fn table_for_entity(entity_type: &str) -> rusqlite::Result<&'static str> {
    ENTITY_TABLES
        .iter()
        .find_map(|(kind, table)| (*kind == entity_type).then_some(*table))
        .ok_or(rusqlite::Error::InvalidQuery)
}

/// Generates a monotonic local HLC value.
fn next_clock(
    tx: &Transaction<'_>,
    account_id: &str,
    device_id: &str,
) -> rusqlite::Result<SyncClock> {
    let previous: Option<(i64, i64)> = tx
        .query_row(
            "SELECT wall_time, counter
             FROM sync_clock
             WHERE account_id = ?1 AND device_id = ?2",
            params![account_id, device_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()?;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .min(i64::MAX as u128) as i64;

    let (wall_time, counter) = match previous {
        Some((previous_wall, previous_counter)) if previous_wall >= now => {
            (previous_wall, previous_counter.saturating_add(1))
        }
        _ => (now, 0),
    };

    tx.execute(
        "INSERT INTO sync_clock(
            account_id, device_id, wall_time, counter
         )
         VALUES(?1, ?2, ?3, ?4)
         ON CONFLICT(account_id, device_id)
         DO UPDATE SET
            wall_time = excluded.wall_time,
            counter = excluded.counter,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
        params![account_id, device_id, wall_time, counter],
    )?;

    Ok(SyncClock {
        wall_time,
        counter,
        device_id: device_id.to_string(),
    })
}

fn record_field_versions(
    tx: &Transaction<'_>,
    account_id: &str,
    entity_type: &str,
    entity_id: &str,
    before: Option<Value>,
    after: Option<Value>,
    clock: &SyncClock,
) -> rusqlite::Result<()> {
    let mut fields = BTreeSet::new();

    if let Some(Value::Object(object)) = &before {
        fields.extend(object.keys().cloned());
    }

    if let Some(Value::Object(object)) = &after {
        fields.extend(object.keys().cloned());
    }

    if fields.is_empty() {
        fields.insert("__value".to_string());
    }

    for field in fields {
        let old_value = before.as_ref().and_then(|value| value.get(&field));
        let new_value = after.as_ref().and_then(|value| value.get(&field));

        if old_value == new_value {
            continue;
        }

        record_field_version(tx, account_id, entity_type, entity_id, &field, clock)?;
    }

    Ok(())
}

fn record_field_version(
    tx: &Transaction<'_>,
    account_id: &str,
    entity_type: &str,
    entity_id: &str,
    field_name: &str,
    clock: &SyncClock,
) -> rusqlite::Result<()> {
    tx.execute(
        "INSERT INTO sync_field_versions(
            account_id,
            entity_type,
            entity_id,
            field_name,
            hlc_wall_time,
            hlc_counter,
            hlc_device_id
         )
         VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(
            account_id, entity_type, entity_id, field_name
         )
         DO UPDATE SET
            hlc_wall_time = excluded.hlc_wall_time,
            hlc_counter = excluded.hlc_counter,
            hlc_device_id = excluded.hlc_device_id",
        params![
            account_id,
            entity_type,
            entity_id,
            field_name,
            clock.wall_time,
            clock.counter,
            clock.device_id,
        ],
    )?;

    Ok(())
}

impl Database {
    /// Advances the local HLC after observing a remote clock.
    pub fn observe_remote_sync_clock(
        &self,
        remote_wall_time: i64,
        remote_counter: i64,
    ) -> rusqlite::Result<SyncClock> {
        let mut connection = self
            .connection
            .lock()
            .map_err(|_| rusqlite::Error::InvalidQuery)?;

        let tx = connection.transaction()?;

        let (account_id, device_id): (String, String) = tx.query_row(
            "SELECT a.id, d.id
                 FROM accounts a
                 INNER JOIN devices d ON d.account_id = a.id
                 WHERE a.is_local = 1
                 ORDER BY d.created_at
                 LIMIT 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )?;

        let local: Option<(i64, i64)> = tx
            .query_row(
                "SELECT wall_time, counter
                 FROM sync_clock
                 WHERE account_id = ?1 AND device_id = ?2",
                params![account_id, device_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .optional()?;

        let (local_wall, local_counter) = local.unwrap_or((0, 0));

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
            .min(i64::MAX as u128) as i64;

        let remote_wall_time = remote_wall_time.max(0);
        let remote_counter = remote_counter.max(0);

        let wall_time = now.max(local_wall).max(remote_wall_time);

        let counter = if wall_time == local_wall && wall_time == remote_wall_time {
            local_counter.max(remote_counter).saturating_add(1)
        } else if wall_time == local_wall {
            local_counter.saturating_add(1)
        } else if wall_time == remote_wall_time {
            remote_counter.saturating_add(1)
        } else {
            0
        };

        tx.execute(
            "INSERT INTO sync_clock(
                account_id, device_id, wall_time, counter
             )
             VALUES(?1, ?2, ?3, ?4)
             ON CONFLICT(account_id, device_id)
             DO UPDATE SET
                wall_time = excluded.wall_time,
                counter = excluded.counter,
                updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
            params![account_id, device_id, wall_time, counter],
        )?;

        tx.commit()?;

        Ok(SyncClock {
            wall_time,
            counter,
            device_id,
        })
    }

    /// Reads pending operations in deterministic HLC order.
    pub fn get_pending_sync_changes(&self, limit: usize) -> rusqlite::Result<Vec<SyncChange>> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| rusqlite::Error::InvalidQuery)?;

        let bounded_limit = limit.clamp(1, 500) as i64;

        let mut statement = connection.prepare(
            "SELECT operation_id, account_id, device_id,
                    entity_type, entity_id, operation, payload_json,
                    hlc_wall_time, hlc_counter, hlc_device_id,
                    created_at, synced_at, attempts, last_error
             FROM sync_changes
             WHERE synced_at IS NULL
             ORDER BY hlc_wall_time, hlc_counter,
                      hlc_device_id, operation_id
             LIMIT ?1",
        )?;

        let rows = statement.query_map(params![bounded_limit], |row| {
            let payload_raw: Option<String> = row.get(6)?;

            let payload =
                payload_raw.map(|raw| serde_json::from_str::<Value>(&raw).unwrap_or(Value::Null));

            Ok(SyncChange {
                operation_id: row.get(0)?,
                account_id: row.get(1)?,
                device_id: row.get(2)?,
                entity_type: row.get(3)?,
                entity_id: row.get(4)?,
                operation: row.get(5)?,
                payload,
                clock: SyncClock {
                    wall_time: row.get(7)?,
                    counter: row.get(8)?,
                    device_id: row.get(9)?,
                },
                created_at: row.get(10)?,
                synced_at: row.get(11)?,
                attempts: row.get(12)?,
                last_error: row.get(13)?,
            })
        })?;

        rows.collect()
    }

    /// Marks operations as synced only after server acknowledgement.
    pub fn mark_sync_changes_synced(&self, operation_ids: &[String]) -> rusqlite::Result<()> {
        if operation_ids.is_empty() {
            return Ok(());
        }

        let mut connection = self
            .connection
            .lock()
            .map_err(|_| rusqlite::Error::InvalidQuery)?;

        let tx = connection.transaction()?;

        for operation_id in operation_ids {
            let entity: Option<(String, String)> = tx
                .query_row(
                    "SELECT entity_type, entity_id
                     FROM sync_changes
                     WHERE operation_id = ?1",
                    params![operation_id],
                    |row| Ok((row.get(0)?, row.get(1)?)),
                )
                .optional()?;

            tx.execute(
                "UPDATE sync_changes
                 SET synced_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                     last_error = NULL
                 WHERE operation_id = ?1 AND synced_at IS NULL",
                params![operation_id],
            )?;

            if let Some((entity_type, entity_id)) = entity {
                let table = table_for_entity(&entity_type)?;

                let sql = format!(
                    "UPDATE {table}
                     SET sync_status = 'synced'
                     WHERE id = ?1
                       AND NOT EXISTS (
                           SELECT 1 FROM sync_changes
                           WHERE entity_type = ?2
                             AND entity_id = ?1
                             AND synced_at IS NULL
                       )"
                );

                tx.execute(&sql, params![entity_id, entity_type])?;
            }
        }

        tx.execute(
            "UPDATE sync_state
             SET last_upload_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                 last_success_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                 last_error = NULL,
                 status = 'idle',
                 updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE (account_id, device_id) = (
                 SELECT a.id, d.id
                 FROM accounts a
                 INNER JOIN devices d ON d.account_id = a.id
                 WHERE a.is_local = 1
                 ORDER BY d.created_at
                 LIMIT 1
             )",
            [],
        )?;

        tx.commit()
    }

    /// Records an upload failure without discarding the pending operation.
    pub fn record_sync_change_failure(
        &self,
        operation_id: &str,
        error: &str,
    ) -> rusqlite::Result<()> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| rusqlite::Error::InvalidQuery)?;

        connection.execute(
            "UPDATE sync_changes
             SET attempts = attempts + 1, last_error = ?2
             WHERE operation_id = ?1 AND synced_at IS NULL",
            params![operation_id, error],
        )?;

        connection.execute(
            "UPDATE sync_state
             SET status = 'error',
                 last_error = ?1,
                 updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE (account_id, device_id) = (
                 SELECT a.id, d.id
                 FROM accounts a
                 INNER JOIN devices d ON d.account_id = a.id
                 WHERE a.is_local = 1
                 ORDER BY d.created_at
                 LIMIT 1
             )",
            params![error],
        )?;

        Ok(())
    }

    /// Returns the local queue count and latest sync metadata.
    pub fn get_sync_queue_summary(&self) -> rusqlite::Result<SyncQueueSummary> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| rusqlite::Error::InvalidQuery)?;

        connection.query_row(
            "SELECT a.id, d.id,
                    (SELECT COUNT(*) FROM sync_changes c
                     WHERE c.account_id = a.id
                       AND c.synced_at IS NULL),
                    s.last_upload_at, s.last_download_at,
                    s.last_success_at, s.last_error, s.status
             FROM accounts a
             INNER JOIN devices d ON d.account_id = a.id
             LEFT JOIN sync_state s
               ON s.account_id = a.id AND s.device_id = d.id
             WHERE a.is_local = 1
             ORDER BY d.created_at
             LIMIT 1",
            [],
            |row| {
                Ok(SyncQueueSummary {
                    account_id: row.get(0)?,
                    device_id: row.get(1)?,
                    pending_count: row.get(2)?,
                    last_upload_at: row.get(3)?,
                    last_download_at: row.get(4)?,
                    last_success_at: row.get(5)?,
                    last_error: row.get(6)?,
                    status: row
                        .get::<_, Option<String>>(7)?
                        .unwrap_or_else(|| "local-only".to_string()),
                })
            },
        )
    }
}
