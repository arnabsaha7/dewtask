mod database;

use database::Database;
use std::collections::HashMap;
use tauri::{Manager, State};

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let database = Database::new(app.handle())?;
            app.manage(database);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            storage_get,
            storage_set,
            storage_remove,
            storage_clear,
            storage_read_all,
            storage_replace_all
        ])
        .run(tauri::generate_context!())
        .expect("error while running TaskNest");
}
