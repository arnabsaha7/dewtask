mod database;
mod google_auth;

use database::{Database, LocalIdentity, SyncChange, SyncClock, SyncQueueSummary};

use std::collections::HashMap;
use tauri::{Manager, State};

// -----------------------------------------------------------------------------
// Existing storage commands
// -----------------------------------------------------------------------------

#[tauri::command]
fn storage_get(db: State<'_, Database>, key: String) -> Result<Option<String>, String> {
    db.get(&key).map_err(|error| error.to_string())
}

#[tauri::command]
fn storage_set(db: State<'_, Database>, key: String, value: String) -> Result<(), String> {
    db.set(&key, &value).map_err(|error| error.to_string())
}

#[tauri::command]
fn storage_remove(db: State<'_, Database>, key: String) -> Result<(), String> {
    db.remove(&key).map_err(|error| error.to_string())
}

#[tauri::command]
fn storage_clear(db: State<'_, Database>) -> Result<(), String> {
    db.clear().map_err(|error| error.to_string())
}

#[tauri::command]
fn storage_read_all(db: State<'_, Database>) -> Result<HashMap<String, String>, String> {
    db.read_all().map_err(|error| error.to_string())
}

#[tauri::command]
fn storage_replace_all(
    db: State<'_, Database>,
    values: HashMap<String, String>,
) -> Result<(), String> {
    db.replace_all(values).map_err(|error| error.to_string())
}

// -----------------------------------------------------------------------------
// Local account and device identity commands
// -----------------------------------------------------------------------------

#[tauri::command]
fn identity_get(db: State<'_, Database>) -> Result<LocalIdentity, String> {
    db.get_local_identity().map_err(|error| error.to_string())
}

#[tauri::command]
fn identity_update_device_name(db: State<'_, Database>, device_name: String) -> Result<(), String> {
    db.update_local_device_name(&device_name)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn identity_update_display_name(
    db: State<'_, Database>,
    display_name: String,
) -> Result<(), String> {
    db.update_local_display_name(&display_name)
        .map_err(|error| error.to_string())
}

// -----------------------------------------------------------------------------
// Synchronization commands
// -----------------------------------------------------------------------------

#[tauri::command]
fn sync_observe_remote_clock(
    db: State<'_, Database>,
    wall_time: i64,
    counter: i64,
) -> Result<SyncClock, String> {
    db.observe_remote_sync_clock(wall_time, counter)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn sync_get_pending_changes(
    db: State<'_, Database>,
    limit: Option<usize>,
) -> Result<Vec<SyncChange>, String> {
    db.get_pending_sync_changes(limit.unwrap_or(100))
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn sync_mark_changes_synced(
    db: State<'_, Database>,
    operation_ids: Vec<String>,
) -> Result<(), String> {
    db.mark_sync_changes_synced(&operation_ids)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn sync_record_change_failure(
    db: State<'_, Database>,
    operation_id: String,
    error: String,
) -> Result<(), String> {
    db.record_sync_change_failure(&operation_id, &error)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn sync_get_queue_summary(db: State<'_, Database>) -> Result<SyncQueueSummary, String> {
    db.get_sync_queue_summary()
        .map_err(|error| error.to_string())
}

// -----------------------------------------------------------------------------
// Application entry point
// -----------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;

            let database = Database::new(app.handle())?;
            app.manage(database);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Storage
            storage_get,
            storage_set,
            storage_remove,
            storage_clear,
            storage_read_all,
            storage_replace_all,
            // Identity
            identity_get,
            identity_update_device_name,
            identity_update_display_name,
            // Synchronization
            sync_observe_remote_clock,
            sync_get_pending_changes,
            sync_mark_changes_synced,
            sync_record_change_failure,
            sync_get_queue_summary,
            // Google authentication
            google_auth::google_sign_in,
            google_auth::google_sign_out
        ])
        .run(tauri::generate_context!())
        .expect("error while running TaskNest");
}
