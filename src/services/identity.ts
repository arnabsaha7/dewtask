import { Capacitor } from '@capacitor/core'
import { invoke, isTauri } from '@tauri-apps/api/core'

import type { TaskNestAccount, TaskNestDevice } from '../types/sync'

export interface TaskNestIdentity {
  account: TaskNestAccount
  device: TaskNestDevice
}

const IDENTITY_STORAGE_KEY = 'tasknest_local_identity'
let identityPromise: Promise<TaskNestIdentity> | null = null
let cachedIdentity: TaskNestIdentity | null = null

function createId(prefix: string): string {
  const uuid = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${uuid}`
}

function defaultDeviceName(platform: string): string {
  if (platform === 'android') return 'Android device'
  if (platform === 'ios') return 'iPhone or iPad'
  if (platform === 'windows') return 'Windows device'
  if (platform === 'macos') return 'Mac'
  if (platform === 'linux') return 'Linux device'
  return 'This device'
}

function createLocalIdentity(): TaskNestIdentity {
  const now = new Date().toISOString()
  const platform = Capacitor.getPlatform()
  const accountId = createId('local')

  return {
    account: {
      id: accountId,
      provider: 'local',
      providerUserId: null,
      email: null,
      displayName: null,
      isLocal: true,
      createdAt: now,
      updatedAt: now,
    },
    device: {
      id: createId('device'),
      accountId,
      deviceName: defaultDeviceName(platform),
      platform,
      lastSeenAt: now,
      createdAt: now,
    },
  }
}

function readBrowserIdentity(): TaskNestIdentity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as TaskNestIdentity
    if (parsed?.account?.id && parsed?.device?.id && parsed.device.accountId === parsed.account.id) {
      return {
        ...parsed,
        device: { ...parsed.device, lastSeenAt: new Date().toISOString() },
      }
    }
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
  return null
}

function writeBrowserIdentity(identity: TaskNestIdentity): void {
  try {
    localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(identity))
  } catch {
    // Keep the identity in memory for this session if browser storage is unavailable.
  }
}

/**
 * Loads the persistent local account/device identity. Desktop identity is stored
 * in the existing SQLite database; mobile and browser builds use localStorage.
 */
export async function getTaskNestIdentity(): Promise<TaskNestIdentity> {
  if (cachedIdentity) return cachedIdentity
  if (!identityPromise) {
    identityPromise = (async () => {
      if (isTauri()) {
        const identity = await invoke<TaskNestIdentity>('identity_get')
        cachedIdentity = identity
        return identity
      }

      const identity = readBrowserIdentity() ?? createLocalIdentity()
      writeBrowserIdentity(identity)
      cachedIdentity = identity
      return identity
    })().catch((error) => {
      identityPromise = null
      throw error
    })
  }
  return identityPromise
}

/** Updates the device label while preserving the stable device identifier. */
export async function updateTaskNestDeviceName(deviceName: string): Promise<TaskNestIdentity> {
  const normalizedName = deviceName.trim()
  if (!normalizedName || normalizedName.length > 80) {
    throw new Error('Device name must contain between 1 and 80 characters.')
  }

  if (isTauri()) {
    await invoke('identity_update_device_name', { deviceName: normalizedName })
    cachedIdentity = await invoke<TaskNestIdentity>('identity_get')
    identityPromise = Promise.resolve(cachedIdentity)
    return cachedIdentity
  }

  const identity = await getTaskNestIdentity()
  const updated: TaskNestIdentity = {
    ...identity,
    device: { ...identity.device, deviceName: normalizedName, lastSeenAt: new Date().toISOString() },
  }
  writeBrowserIdentity(updated)
  cachedIdentity = updated
  identityPromise = Promise.resolve(updated)
  return updated
}


/** Updates the local account display name without changing its stable account ID. */
export async function updateTaskNestDisplayName(displayName: string): Promise<TaskNestIdentity> {
  const normalizedName = displayName.trim()
  if (!normalizedName || normalizedName.length > 80) {
    throw new Error('Display name must contain between 1 and 80 characters.')
  }

  if (isTauri()) {
    await invoke('identity_update_display_name', { displayName: normalizedName })
    cachedIdentity = await invoke<TaskNestIdentity>('identity_get')
    identityPromise = Promise.resolve(cachedIdentity)
    return cachedIdentity
  }

  const identity = await getTaskNestIdentity()
  const now = new Date().toISOString()
  const updated: TaskNestIdentity = {
    ...identity,
    account: { ...identity.account, displayName: normalizedName, updatedAt: now },
  }
  writeBrowserIdentity(updated)
  cachedIdentity = updated
  identityPromise = Promise.resolve(updated)
  return updated
}

/** Clears only the in-memory cache; persistent identity is intentionally retained. */
export function refreshTaskNestIdentity(): void {
  cachedIdentity = null
  identityPromise = null
}


/** Starts Google OAuth in the system browser and links it to the existing local account. */
export async function signInWithGoogle(): Promise<TaskNestIdentity> {
  if (!isTauri()) {
    throw new Error('Google sign-in is available in the TaskNest desktop app.')
  }

  const identity = await invoke<TaskNestIdentity>('google_sign_in')
  cachedIdentity = identity
  identityPromise = Promise.resolve(identity)
  return identity
}

/** Signs out of Google without deleting the local account or its data. */
export async function signOutFromGoogle(): Promise<TaskNestIdentity> {
  if (!isTauri()) {
    throw new Error('Google sign-out is available in the TaskNest desktop app.')
  }

  const identity = await invoke<TaskNestIdentity>('google_sign_out')
  cachedIdentity = identity
  identityPromise = Promise.resolve(identity)
  return identity
}
