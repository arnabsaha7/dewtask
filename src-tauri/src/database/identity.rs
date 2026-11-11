use rusqlite::{params, OptionalExtension};
use serde::Serialize;

use super::Database;

/// The local TaskNest account and this installation's persistent device identity.
/// Google authentication is linked to this stable local data owner without replacing it.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalIdentity {
    pub account: LocalAccount,
    pub device: LocalDevice,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalAccount {
    pub id: String,
    pub provider: String,
    pub provider_user_id: Option<String>,
    pub email: Option<String>,
    pub display_name: Option<String>,
    pub is_local: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalDevice {
    pub id: String,
    pub account_id: String,
    pub device_name: String,
    pub platform: String,
    pub last_seen_at: Option<String>,
    pub created_at: String,
}

impl Database {
    /// Returns the persistent local account and device created by schema migration v3.
    pub fn get_local_identity(&self) -> rusqlite::Result<LocalIdentity> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| rusqlite::Error::InvalidQuery)?;

        let account = connection.query_row(
            "SELECT id, provider, provider_user_id, email, display_name, is_local, created_at, updated_at
             FROM accounts
             WHERE is_local = 1
             ORDER BY created_at
             LIMIT 1",
            [],
            |row| {
                Ok(LocalAccount {
                    id: row.get(0)?,
                    provider: row.get(1)?,
                    provider_user_id: row.get(2)?,
                    email: row.get(3)?,
                    display_name: row.get(4)?,
                    // The database row remains the local data owner. The returned
                    // flag represents whether this account is currently Google-linked.
                    is_local: row.get::<_, String>(1)? == "local",
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            },
        )?;

        connection.execute(
            "UPDATE devices
             SET last_seen_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE account_id = ?1",
            params![account.id],
        )?;

        let device = connection
            .query_row(
                "SELECT id, account_id, device_name, platform, last_seen_at, created_at
             FROM devices
             WHERE account_id = ?1
             ORDER BY created_at
             LIMIT 1",
                params![account.id],
                |row| {
                    Ok(LocalDevice {
                        id: row.get(0)?,
                        account_id: row.get(1)?,
                        device_name: row.get(2)?,
                        platform: row.get(3)?,
                        last_seen_at: row.get(4)?,
                        created_at: row.get(5)?,
                    })
                },
            )
            .optional()?
            .ok_or(rusqlite::Error::QueryReturnedNoRows)?;

        Ok(LocalIdentity { account, device })
    }

    /// Renames this installation's device without changing its persistent ID.
    pub fn update_local_device_name(&self, device_name: &str) -> rusqlite::Result<()> {
        let normalized = device_name.trim();
        if normalized.is_empty() || normalized.chars().count() > 80 {
            return Err(rusqlite::Error::InvalidParameterName(
                "device_name must contain between 1 and 80 characters".to_string(),
            ));
        }

        let connection = self
            .connection
            .lock()
            .map_err(|_| rusqlite::Error::InvalidQuery)?;
        connection.execute(
            "UPDATE devices
             SET device_name = ?1,
                 last_seen_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE id = (
                 SELECT d.id
                 FROM devices d
                 INNER JOIN accounts a ON a.id = d.account_id
                 WHERE a.is_local = 1
                 ORDER BY d.created_at
                 LIMIT 1
             )",
            params![normalized],
        )?;
        Ok(())
    }

    /// Updates the local account display name while preserving its account ID.
    pub fn update_local_display_name(&self, display_name: &str) -> rusqlite::Result<()> {
        let normalized = display_name.trim();
        if normalized.is_empty() || normalized.chars().count() > 80 {
            return Err(rusqlite::Error::InvalidParameterName(
                "display_name must contain between 1 and 80 characters".to_string(),
            ));
        }

        let connection = self
            .connection
            .lock()
            .map_err(|_| rusqlite::Error::InvalidQuery)?;
        let changed = connection.execute(
            "UPDATE accounts
             SET display_name = ?1,
                 updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE is_local = 1",
            params![normalized],
        )?;

        if changed == 0 {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        }

        Ok(())
    }

    /// Links a verified Google identity to the existing local account.
    /// The local account/device IDs and all account-owned data remain unchanged.
    pub fn link_google_identity(
        &self,
        provider_user_id: &str,
        email: &str,
        display_name: &str,
    ) -> rusqlite::Result<()> {
        let provider_user_id = provider_user_id.trim();
        let email = email.trim();
        let display_name = display_name.trim();

        if provider_user_id.is_empty() || email.is_empty() {
            return Err(rusqlite::Error::InvalidParameterName(
                "Google identity is missing a subject or email".to_string(),
            ));
        }

        let connection = self
            .connection
            .lock()
            .map_err(|_| rusqlite::Error::InvalidQuery)?;

        // Keep is_local=1 in SQLite: it identifies the local data owner.
        // provider='google' represents the linked sign-in identity.
        connection.execute(
            "UPDATE accounts
             SET provider = 'google',
                 provider_user_id = ?1,
                 email = ?2,
                 display_name = ?3,
                 updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE is_local = 1",
            params![provider_user_id, email, display_name],
        )?;

        Ok(())
    }

    /// Unlinks Google while preserving the local account and all its data.
    pub fn unlink_google_identity(&self) -> rusqlite::Result<()> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| rusqlite::Error::InvalidQuery)?;

        connection.execute(
            "UPDATE accounts
             SET provider = 'local',
                 provider_user_id = NULL,
                 email = NULL,
                 display_name = NULL,
                 updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE is_local = 1",
            [],
        )?;

        Ok(())
    }
}
