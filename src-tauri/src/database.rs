use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde_json::{json, Value};
use std::{collections::HashMap, fs, path::PathBuf, sync::Mutex};
use tauri::{AppHandle, Manager};

const DATA_KEYS: [&str; 5] = [
    "tasknest_workspaces",
    "tasknest_categories",
    "tasknest_tags",
    "tasknest_tasks",
    "tasknest_settings",
];

pub struct Database {
    connection: Mutex<Connection>,
    database_path: PathBuf,
}

impl Database {
    pub fn new(app: &AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        let app_data_dir = app.path().app_data_dir()?;
        fs::create_dir_all(&app_data_dir)?;
        let database_path = app_data_dir.join("tasknest.sqlite3");
        let connection = Connection::open(&database_path)?;
        connection.pragma_update(None, "foreign_keys", "ON")?;
        connection.pragma_update(None, "journal_mode", "WAL")?;
        connection.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY NOT NULL,
                applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            );

            -- Kept temporarily so existing Stage 1 installations can migrate safely.
            CREATE TABLE IF NOT EXISTS app_storage (
                key TEXT PRIMARY KEY NOT NULL,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            );

            CREATE TABLE IF NOT EXISTS workspaces (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                icon TEXT,
                color TEXT,
                cover_image TEXT,
                sort_order INTEGER,
                created_at TEXT,
                updated_at TEXT,
                data_json TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY NOT NULL,
                workspace_id TEXT NOT NULL,
                parent_id TEXT,
                name TEXT NOT NULL,
                sort_order INTEGER,
                data_json TEXT NOT NULL,
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
                FOREIGN KEY(parent_id) REFERENCES categories(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
            );

            CREATE TABLE IF NOT EXISTS tags (
                id TEXT PRIMARY KEY NOT NULL,
                workspace_id TEXT NOT NULL,
                name TEXT NOT NULL,
                color TEXT,
                created_at TEXT,
                updated_at TEXT,
                data_json TEXT NOT NULL,
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY NOT NULL,
                workspace_id TEXT NOT NULL,
                category_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                priority TEXT,
                status TEXT,
                due_date TEXT,
                created_at TEXT,
                updated_at TEXT,
                completed_at TEXT,
                auto_progression_enabled INTEGER NOT NULL DEFAULT 0,
                auto_progression_start_at TEXT,
                auto_progression_end_at TEXT,
                data_json TEXT NOT NULL,
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
                FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS task_tags (
                task_id TEXT NOT NULL,
                tag_id TEXT NOT NULL,
                PRIMARY KEY(task_id, tag_id),
                FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
                FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS task_checklists (
                id TEXT PRIMARY KEY NOT NULL,
                task_id TEXT NOT NULL,
                text TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                position INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY NOT NULL,
                value_json TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            );

            CREATE INDEX IF NOT EXISTS idx_categories_workspace_parent ON categories(workspace_id, parent_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
            CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
            CREATE INDEX IF NOT EXISTS idx_tags_workspace ON tags(workspace_id);
            CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON task_tags(tag_id);
            "#,
        )?;

        let db = Self { connection: Mutex::new(connection), database_path };
        db.migrate_legacy_storage()?;
        Ok(db)
    }

    fn migrate_legacy_storage(&self) -> rusqlite::Result<()> {
        let connection = self.connection.lock().map_err(|_| rusqlite::Error::InvalidQuery)?;
        let migrated: Option<i64> = connection.query_row(
            "SELECT version FROM schema_migrations WHERE version = 2", [], |row| row.get(0)
        ).optional()?;
        if migrated.is_some() { return Ok(()); }

        let mut legacy = HashMap::<String, String>::new();
        {
            let mut stmt = connection.prepare("SELECT key, value FROM app_storage")?;
            let rows = stmt.query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))?;
            for row in rows {
                let (key, value) = row?;
                legacy.insert(key, value);
            }
        }
        drop(connection);

        // Existing records are copied through the same relational write path. The legacy
        // table is retained until all writes succeed, so an interrupted migration is recoverable.
        for key in DATA_KEYS {
            if let Some(value) = legacy.get(key) {
                self.set(key, value)?;
            }
        }

        let connection = self.connection.lock().map_err(|_| rusqlite::Error::InvalidQuery)?;
        connection.execute("INSERT OR IGNORE INTO schema_migrations(version) VALUES (2)", [])?;
        connection.execute("DROP TABLE IF EXISTS app_storage", [])?;
        Ok(())
    }

    pub fn get(&self, key: &str) -> rusqlite::Result<Option<String>> {
        let connection = self.connection.lock().map_err(|_| rusqlite::Error::InvalidQuery)?;
        match key {
            "tasknest_workspaces" => read_json_rows(&connection, "SELECT data_json FROM workspaces ORDER BY COALESCE(sort_order, 0), rowid"),
            "tasknest_categories" => read_json_rows(&connection, "SELECT data_json FROM categories ORDER BY COALESCE(sort_order, 0), rowid"),
            "tasknest_tasks" => read_json_rows(&connection, "SELECT data_json FROM tasks ORDER BY created_at, rowid"),
            "tasknest_tags" => read_json_rows(&connection, "SELECT data_json FROM tags ORDER BY created_at, rowid"),
            "tasknest_settings" => connection.query_row(
                "SELECT value_json FROM app_settings WHERE key = 'tasknest_settings'", [], |row| row.get(0)
            ).optional(),
            _ => Ok(None),
        }
    }

    pub fn set(&self, key: &str, raw: &str) -> rusqlite::Result<()> {
        let value: Value = serde_json::from_str(raw).map_err(|_| rusqlite::Error::InvalidQuery)?;
        let mut connection = self.connection.lock().map_err(|_| rusqlite::Error::InvalidQuery)?;
        let tx = connection.transaction()?;
        match key {
            "tasknest_workspaces" => write_workspaces(&tx, &value)?,
            "tasknest_categories" => write_categories(&tx, &value)?,
            "tasknest_tags" => write_tags(&tx, &value)?,
            "tasknest_tasks" => write_tasks(&tx, &value)?,
            "tasknest_settings" => {
                tx.execute(
                    "INSERT INTO app_settings(key, value_json) VALUES('tasknest_settings', ?1)
                     ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')",
                    params![raw],
                )?;
            }
            _ => return Err(rusqlite::Error::InvalidQuery),
        }
        tx.commit()
    }

    pub fn remove(&self, key: &str) -> rusqlite::Result<()> {
        let empty = if key == "tasknest_settings" { json!({}) } else { json!([]) };
        self.set(key, &empty.to_string())
    }

    pub fn clear(&self) -> rusqlite::Result<()> {
        let mut connection = self.connection.lock().map_err(|_| rusqlite::Error::InvalidQuery)?;
        connection.execute_batch(
            "DELETE FROM task_tags; DELETE FROM task_checklists; DELETE FROM tasks;
             DELETE FROM tags; DELETE FROM categories; DELETE FROM workspaces; DELETE FROM app_settings;"
        )
    }

    pub fn read_all(&self) -> rusqlite::Result<HashMap<String, String>> {
        let mut result = HashMap::new();
        for key in DATA_KEYS {
            if let Some(value) = self.get(key)? { result.insert(key.to_string(), value); }
        }
        Ok(result)
    }

    pub fn replace_all(&self, values: HashMap<String, String>) -> rusqlite::Result<()> {
        let mut connection = self.connection.lock().map_err(|_| rusqlite::Error::InvalidQuery)?;
        let tx = connection.transaction()?;
        tx.execute_batch(
            "DELETE FROM task_tags; DELETE FROM task_checklists; DELETE FROM tasks;
             DELETE FROM tags; DELETE FROM categories; DELETE FROM workspaces; DELETE FROM app_settings;"
        )?;
        for key in ["tasknest_workspaces", "tasknest_categories", "tasknest_tags", "tasknest_tasks", "tasknest_settings"] {
            if let Some(raw) = values.get(key) {
                let value: Value = serde_json::from_str(raw).map_err(|_| rusqlite::Error::InvalidQuery)?;
                match key {
                    "tasknest_workspaces" => write_workspaces(&tx, &value)?,
                    "tasknest_categories" => write_categories(&tx, &value)?,
                    "tasknest_tags" => write_tags(&tx, &value)?,
                    "tasknest_tasks" => write_tasks(&tx, &value)?,
                    "tasknest_settings" => { tx.execute("INSERT INTO app_settings(key,value_json) VALUES('tasknest_settings',?1)", params![raw])?; }
                    _ => {}
                }
            }
        }
        tx.commit()
    }

    pub fn backup_to(&self, destination: &str) -> Result<(), String> {
        let connection = self.connection.lock().map_err(|_| "Database lock is unavailable".to_string())?;
        connection.execute_batch("PRAGMA wal_checkpoint(FULL)").map_err(|e| e.to_string())?;
        fs::copy(&self.database_path, destination).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn restore_from(&self, source: &str) -> Result<(), String> {
        let source_path = PathBuf::from(source);
        if !source_path.is_file() { return Err("The selected backup file does not exist.".into()); }
        let mut connection = self.connection.lock().map_err(|_| "Database lock is unavailable".to_string())?;
        connection.execute_batch("PRAGMA wal_checkpoint(FULL)").map_err(|e| e.to_string())?;
        let candidate = Connection::open(&source_path).map_err(|e| e.to_string())?;
        candidate.query_row("PRAGMA integrity_check", [], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?;
        let table_exists: bool = candidate.query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='workspaces')",
            [], |row| row.get(0)
        ).map_err(|e| e.to_string())?;
        if !table_exists { return Err("This is not a TaskNest SQLite backup.".into()); }
        let destination = Connection::open(&self.database_path).map_err(|e| e.to_string())?;
        destination.execute_batch("PRAGMA foreign_keys=OFF").map_err(|e| e.to_string())?;
        destination.execute_batch("ATTACH DATABASE ?1 AS restore_db").map_err(|e| e.to_string())?;
        destination.execute_batch(
            "BEGIN IMMEDIATE;
             DELETE FROM task_tags; DELETE FROM task_checklists; DELETE FROM tasks;
             DELETE FROM tags; DELETE FROM categories; DELETE FROM workspaces; DELETE FROM app_settings;
             INSERT INTO workspaces SELECT * FROM restore_db.workspaces;
             INSERT INTO categories SELECT * FROM restore_db.categories;
             INSERT INTO tags SELECT * FROM restore_db.tags;
             INSERT INTO tasks SELECT * FROM restore_db.tasks;
             INSERT INTO task_tags SELECT * FROM restore_db.task_tags;
             INSERT INTO task_checklists SELECT * FROM restore_db.task_checklists;
             INSERT INTO app_settings SELECT * FROM restore_db.app_settings;
             COMMIT;
             DETACH DATABASE restore_db;"
        ).map_err(|e| e.to_string())?;
        Ok(())
    }
}

fn read_json_rows(connection: &Connection, sql: &str) -> rusqlite::Result<Option<String>> {
    let mut stmt = connection.prepare(sql)?;
    let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
    let mut values = Vec::new();
    for row in rows { values.push(serde_json::from_str::<Value>(&row?).unwrap_or(Value::Null)); }
    Ok(Some(Value::Array(values).to_string()))
}

fn array(value: &Value) -> Vec<Value> {
    value.as_array().cloned().unwrap_or_default()
}
fn strv(value: &Value, key: &str) -> Option<String> {
    value.get(key).and_then(Value::as_str).map(str::to_owned)
}
fn boolv(value: &Value, key: &str) -> bool {
    value.get(key).and_then(Value::as_bool).unwrap_or(false)
}
fn intv(value: &Value, key: &str) -> i64 {
    value.get(key).and_then(Value::as_i64).unwrap_or(0)
}
fn optstr(value: &Value, key: &str) -> Option<String> {
    value.get(key).and_then(Value::as_str).map(str::to_owned)
}

fn prune_table(tx: &Transaction<'_>, table: &str, ids: &[String]) -> rusqlite::Result<()> {
    // table is selected only from this module's fixed allow-list.
    let sql = format!("DELETE FROM {table} WHERE id NOT IN (SELECT value FROM json_each(?1))");
    tx.execute(&sql, params![serde_json::to_string(ids).unwrap_or_else(|_| "[]".into())])?;
    Ok(())
}

fn write_workspaces(tx: &Transaction<'_>, value: &Value) -> rusqlite::Result<()> {
    let items = array(value);
    let mut ids = Vec::new();
    for item in items {
        let id = strv(&item,"id").unwrap_or_default();
        ids.push(id.clone());
        tx.execute("INSERT INTO workspaces(id,name,description,icon,color,cover_image,sort_order,created_at,updated_at,data_json)
            VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description,
            icon=excluded.icon, color=excluded.color, cover_image=excluded.cover_image,
            sort_order=excluded.sort_order, created_at=excluded.created_at,
            updated_at=excluded.updated_at, data_json=excluded.data_json",
            params![id, strv(&item,"name").unwrap_or_default(), optstr(&item,"description"),
                optstr(&item,"icon"), optstr(&item,"color"), optstr(&item,"coverImage"),
                intv(&item,"order"), optstr(&item,"createdAt"), optstr(&item,"updatedAt"), item.to_string()])?;
    }
    prune_table(tx, "workspaces", &ids)
}

fn write_categories(tx: &Transaction<'_>, value: &Value) -> rusqlite::Result<()> {
    let items = array(value);
    let mut ids = Vec::new();
    for item in items {
        let id = strv(&item,"id").unwrap_or_default();
        ids.push(id.clone());
        tx.execute("INSERT INTO categories(id,workspace_id,parent_id,name,sort_order,data_json)
            VALUES(?1,?2,?3,?4,?5,?6)
            ON CONFLICT(id) DO UPDATE SET workspace_id=excluded.workspace_id, parent_id=excluded.parent_id,
            name=excluded.name, sort_order=excluded.sort_order, data_json=excluded.data_json",
            params![id, strv(&item,"workspaceId").unwrap_or_default(), optstr(&item,"parentId"),
                strv(&item,"name").unwrap_or_default(), intv(&item,"order"), item.to_string()])?;
    }
    prune_table(tx, "categories", &ids)
}

fn write_tags(tx: &Transaction<'_>, value: &Value) -> rusqlite::Result<()> {
    let items = array(value);
    let mut ids = Vec::new();
    for item in items {
        let id = strv(&item,"id").unwrap_or_default();
        ids.push(id.clone());
        tx.execute("INSERT INTO tags(id,workspace_id,name,color,created_at,updated_at,data_json)
            VALUES(?1,?2,?3,?4,?5,?6,?7)
            ON CONFLICT(id) DO UPDATE SET workspace_id=excluded.workspace_id, name=excluded.name,
            color=excluded.color, created_at=excluded.created_at, updated_at=excluded.updated_at,
            data_json=excluded.data_json",
            params![id, strv(&item,"workspaceId").unwrap_or_default(), strv(&item,"name").unwrap_or_default(),
                optstr(&item,"color"), optstr(&item,"createdAt"), optstr(&item,"updatedAt"), item.to_string()])?;
    }
    prune_table(tx, "tags", &ids)
}

fn write_tasks(tx: &Transaction<'_>, value: &Value) -> rusqlite::Result<()> {
    let items = array(value);
    let mut ids = Vec::new();
    for item in items {
        let id = strv(&item,"id").unwrap_or_default();
        ids.push(id.clone());
        tx.execute("INSERT INTO tasks(id,workspace_id,category_id,title,description,priority,status,due_date,created_at,updated_at,completed_at,auto_progression_enabled,auto_progression_start_at,auto_progression_end_at,data_json)
            VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)
            ON CONFLICT(id) DO UPDATE SET workspace_id=excluded.workspace_id, category_id=excluded.category_id,
            title=excluded.title, description=excluded.description, priority=excluded.priority,
            status=excluded.status, due_date=excluded.due_date, created_at=excluded.created_at,
            updated_at=excluded.updated_at, completed_at=excluded.completed_at,
            auto_progression_enabled=excluded.auto_progression_enabled,
            auto_progression_start_at=excluded.auto_progression_start_at,
            auto_progression_end_at=excluded.auto_progression_end_at, data_json=excluded.data_json",
            params![id, strv(&item,"workspaceId").unwrap_or_default(), strv(&item,"categoryId").unwrap_or_default(),
                strv(&item,"title").unwrap_or_default(), optstr(&item,"description"), optstr(&item,"priority"),
                optstr(&item,"status"), optstr(&item,"dueDate"), optstr(&item,"createdAt"), optstr(&item,"updatedAt"),
                optstr(&item,"completedAt"), boolv(&item,"autoProgressionEnabled") as i64,
                optstr(&item,"autoProgressionStartAt"), optstr(&item,"autoProgressionEndAt"), item.to_string()])?;

        tx.execute("DELETE FROM task_tags WHERE task_id=?1", params![id])?;
        if let Some(tags) = item.get("tagIds").and_then(Value::as_array) {
            for tag in tags {
                if let Some(tag_id) = tag.as_str() {
                    tx.execute("INSERT OR IGNORE INTO task_tags(task_id,tag_id) VALUES(?1,?2)", params![id, tag_id])?;
                }
            }
        }
        tx.execute("DELETE FROM task_checklists WHERE task_id=?1", params![id])?;
        if let Some(checklist) = item.get("checklist").and_then(Value::as_array) {
            for (position, entry) in checklist.iter().enumerate() {
                tx.execute("INSERT INTO task_checklists(id,task_id,text,completed,position) VALUES(?1,?2,?3,?4,?5)",
                    params![strv(entry,"id").unwrap_or_else(|| format!("{id}-{position}")), id,
                        strv(entry,"text").unwrap_or_default(), boolv(entry,"completed") as i64, position as i64])?;
            }
        }
    }
    prune_table(tx, "tasks", &ids)
}
