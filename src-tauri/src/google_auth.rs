use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use keyring::Entry;
use rand::{rngs::OsRng, RngCore};
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tauri::State;
use url::Url;

use crate::database::{Database, LocalIdentity};

// These values are injected by the release workflow at compile time.
// For local development, set the same environment variables before running Tauri.
const GOOGLE_CLIENT_ID: Option<&str> = option_env!("TASKNEST_GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET: Option<&str> = option_env!("TASKNEST_GOOGLE_CLIENT_SECRET");

// Google desktop OAuth client secrets are embedded in installed apps and are not
// confidential. The secret is included because Google's token endpoint currently
// requires it for this configured OAuth client; it must never be treated as a
// server-side secret or used to protect privileged backend operations.
const GOOGLE_AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL: &str = "https://openidconnect.googleapis.com/v1/userinfo";
const KEYRING_SERVICE: &str = "com.tasknest.desktop.google-oauth";
const CALLBACK_TIMEOUT: Duration = Duration::from_secs(180);

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    token_type: String,
    expires_in: u64,
    refresh_token: Option<String>,
    scope: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UserInfo {
    sub: String,
    email: String,
    email_verified: Option<bool>,
    name: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct StoredTokens {
    access_token: String,
    refresh_token: String,
    expires_at: u64,
    scope: Option<String>,
}

fn random_urlsafe(byte_count: usize) -> String {
    let mut bytes = vec![0_u8; byte_count];
    OsRng.fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

fn keyring_entry(account_id: &str) -> Result<Entry, String> {
    Entry::new(KEYRING_SERVICE, account_id)
        .map_err(|error| format!("Could not access secure credential storage: {error}"))
}

fn save_tokens(account_id: &str, tokens: &StoredTokens) -> Result<(), String> {
    let entry = keyring_entry(account_id)?;
    let serialized = serde_json::to_string(tokens)
        .map_err(|error| format!("Could not serialize Google credentials: {error}"))?;
    entry
        .set_password(&serialized)
        .map_err(|error| format!("Could not securely store Google credentials: {error}"))
}

fn delete_tokens(account_id: &str) -> Result<(), String> {
    let entry = keyring_entry(account_id)?;
    // A missing credential is already the desired signed-out state.
    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(format!("Could not remove Google credentials: {error}")),
    }
}

fn callback_code(listener: &TcpListener, expected_state: &str) -> Result<String, String> {
    listener
        .set_nonblocking(true)
        .map_err(|error| format!("Could not prepare OAuth callback: {error}"))?;

    let deadline = Instant::now() + CALLBACK_TIMEOUT;

    loop {
        if Instant::now() >= deadline {
            return Err("Google sign-in timed out. Please try again.".to_string());
        }

        match listener.accept() {
            Ok((mut stream, _)) => {
                stream
                    .set_read_timeout(Some(Duration::from_secs(5)))
                    .ok();

                let mut request = [0_u8; 8192];
                let bytes_read = stream
                    .read(&mut request)
                    .map_err(|error| format!("Could not read Google sign-in response: {error}"))?;

                let request_text = String::from_utf8_lossy(&request[..bytes_read]);
                let request_line = request_text.lines().next().unwrap_or_default();
                let target = request_line.split_whitespace().nth(1).unwrap_or("/");
                let callback_url = Url::parse(&format!("http://localhost{target}"))
                    .map_err(|error| format!("Invalid OAuth callback: {error}"))?;

                let params = callback_url.query_pairs().into_owned().collect::<std::collections::HashMap<_, _>>();

                if let Some(error) = params.get("error") {
                    let body = "<html><body><h2>TaskNest sign-in was cancelled.</h2>You can close this window.</body></html>";
                    let _ = respond(&mut stream, "400 Bad Request", body);
                    return Err(format!("Google sign-in was not completed: {error}"));
                }

                if params.get("state").map(String::as_str) != Some(expected_state) {
                    let body = "<html><body><h2>Invalid sign-in response.</h2>You can close this window.</body></html>";
                    let _ = respond(&mut stream, "400 Bad Request", body);
                    continue;
                }

                let code = params
                    .get("code")
                    .cloned()
                    .ok_or_else(|| "Google did not return an authorization code.".to_string())?;

                let body = "<html><body style=\"font-family:Arial,sans-serif;text-align:center;padding:48px\"><h2>Google authorization received</h2><p>TaskNest is finishing sign-in. You can return to the app.</p></body></html>";
                respond(&mut stream, "200 OK", body)?;
                return Ok(code);
            }
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                thread::sleep(Duration::from_millis(100));
            }
            Err(error) => {
                return Err(format!("OAuth callback listener failed: {error}"));
            }
        }
    }
}

fn respond(stream: &mut TcpStream, status: &str, body: &str) -> Result<(), String> {
    let response = format!(
        "HTTP/1.1 {status}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.as_bytes().len(),
        body
    );
    stream
        .write_all(response.as_bytes())
        .map_err(|error| format!("Could not finish Google sign-in callback: {error}"))
}

fn authorize() -> Result<(TokenResponse, UserInfo), String> {
    let client_id = GOOGLE_CLIENT_ID
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| {
            "Google OAuth client ID is not configured. Set TASKNEST_GOOGLE_CLIENT_ID before compiling TaskNest.".to_string()
        })?;
    let client_secret = GOOGLE_CLIENT_SECRET
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| {
            "Google OAuth client secret is not configured. Set TASKNEST_GOOGLE_CLIENT_SECRET before compiling TaskNest.".to_string()
        })?;

    let listener = TcpListener::bind(("127.0.0.1", 0))
        .map_err(|error| format!("Could not start local OAuth callback: {error}"))?;
    let port = listener
        .local_addr()
        .map_err(|error| format!("Could not determine OAuth callback port: {error}"))?
        .port();
    let redirect_uri = format!("http://127.0.0.1:{port}");
    eprintln!("[google-auth] Started loopback callback on 127.0.0.1:{port}");

    let state = random_urlsafe(32);
    let verifier = random_urlsafe(64);
    let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));

    let mut authorization_url = Url::parse(GOOGLE_AUTH_URL)
        .map_err(|error| format!("Invalid Google authorization endpoint: {error}"))?;
    authorization_url.query_pairs_mut()
        .append_pair("client_id", client_id)
        .append_pair("redirect_uri", &redirect_uri)
        .append_pair("response_type", "code")
        .append_pair("scope", "openid email profile https://www.googleapis.com/auth/drive.appdata")
        .append_pair("state", &state)
        .append_pair("code_challenge", &challenge)
        .append_pair("code_challenge_method", "S256")
        .append_pair("access_type", "offline")
        .append_pair("prompt", "consent")
        .append_pair("include_granted_scopes", "true");

    webbrowser::open(authorization_url.as_str())
        .map_err(|error| format!("Could not open your browser for Google sign-in: {error}"))?;

    let code = callback_code(&listener, &state)?;
    eprintln!("[google-auth] OAuth callback received and state validated");

    let client = Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|error| format!("Could not initialize Google authentication: {error}"))?;

    let token_response = client
        .post(GOOGLE_TOKEN_URL)
        .form(&[
            ("client_id", client_id),
            ("client_secret", client_secret),
            ("code", code.as_str()),
            ("code_verifier", verifier.as_str()),
            ("grant_type", "authorization_code"),
            ("redirect_uri", redirect_uri.as_str()),
        ])
        .send()
        .map_err(|error| format!("Google token exchange failed: {error}"))?;

    let token_status = token_response.status();
    let token_body = token_response
        .text()
        .map_err(|error| format!("Could not read Google's token response: {error}"))?;
    if !token_status.is_success() {
        eprintln!("[google-auth] Token exchange failed with HTTP {token_status}: {token_body}");
        return Err(format!("Google token exchange failed (HTTP {token_status}): {token_body}"));
    }
    eprintln!("[google-auth] Token exchange succeeded");

    let token: TokenResponse = serde_json::from_str(&token_body)
        .map_err(|error| format!("Google returned an invalid token response: {error}"))?;

    let user_response = client
        .get(GOOGLE_USERINFO_URL)
        .bearer_auth(&token.access_token)
        .send()
        .map_err(|error| format!("Could not retrieve your Google profile: {error}"))?;
    let user_status = user_response.status();
    let user_body = user_response
        .text()
        .map_err(|error| format!("Could not read Google's profile response: {error}"))?;
    if !user_status.is_success() {
        eprintln!("[google-auth] User profile request failed with HTTP {user_status}: {user_body}");
        return Err(format!("Google profile verification failed (HTTP {user_status}): {user_body}"));
    }
    let user: UserInfo = serde_json::from_str(&user_body)
        .map_err(|error| format!("Google returned an invalid profile: {error}"))?;
    eprintln!("[google-auth] Google profile retrieved");

    if user.email_verified == Some(false) {
        return Err("The Google account email address is not verified.".to_string());
    }

    if token.scope.as_deref().is_some_and(|scopes| {
        !scopes.split_whitespace().any(|scope| {
            scope == "https://www.googleapis.com/auth/drive.appdata"
        })
    }) {
        return Err("Google did not grant TaskNest access to its private Drive app data folder. Please review the requested permissions and try again.".to_string());
    }

    if token.refresh_token.as_deref().unwrap_or_default().is_empty() {
        return Err("Google did not issue a refresh token. Please revoke TaskNest access in your Google Account and try again.".to_string());
    }

    // Keep these values consumed/validated so a malformed token response is rejected.
    if token.token_type.to_ascii_lowercase() != "bearer" {
        return Err("Google returned an unsupported token type.".to_string());
    }

    Ok((token, user))
}

#[tauri::command]
pub async fn google_sign_in(db: State<'_, Database>) -> Result<LocalIdentity, String> {
    let current_identity = db
        .get_local_identity()
        .map_err(|error| format!("Could not load the local TaskNest account: {error}"))?;

    // OAuth browser interaction and HTTP requests run off the UI thread.
    let (token, user) = tauri::async_runtime::spawn_blocking(authorize)
        .await
        .map_err(|error| format!("Google sign-in worker failed: {error}"))??;
    let display_name = user.name.unwrap_or_else(|| "Google account".to_string());

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let refresh_token = token.refresh_token.unwrap_or_default();
    let stored = StoredTokens {
        access_token: token.access_token,
        refresh_token,
        expires_at: now.saturating_add(token.expires_in),
        scope: token.scope,
    };

    eprintln!("[google-auth] Storing Google credentials for the existing local account");
    save_tokens(&current_identity.account.id, &stored)?;

    if let Err(error) = db.link_google_identity(
        &user.sub,
        &user.email,
        &display_name,
    ) {
        let _ = delete_tokens(&current_identity.account.id);
        return Err(format!("Could not link Google to your local TaskNest account: {error}"));
    }

    eprintln!("[google-auth] Google identity linked; reloading TaskNest identity");
    db.get_local_identity()
        .map_err(|error| format!("Google sign-in succeeded, but TaskNest could not reload the account: {error}"))
}

#[tauri::command]
pub fn google_sign_out(db: State<'_, Database>) -> Result<LocalIdentity, String> {
    let identity = db
        .get_local_identity()
        .map_err(|error| format!("Could not load the TaskNest account: {error}"))?;

    delete_tokens(&identity.account.id)?;

    db.unlink_google_identity()
        .map_err(|error| format!("Could not unlink Google from TaskNest: {error}"))?;

    db.get_local_identity()
        .map_err(|error| format!("Google was unlinked, but TaskNest could not reload the account: {error}"))
}
