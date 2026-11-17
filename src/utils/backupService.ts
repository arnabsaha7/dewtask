import { Capacitor } from '@capacitor/core'
import { isTauri } from '@tauri-apps/api/core'
import { documentDir, join } from '@tauri-apps/api/path'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type TaskNestSettings,
} from '../hooks/useSettings'
import { readAllStorage, replaceAllStorage } from './storage'
import {
  decryptBackupPayload,
  encryptBackupPayload,
  isEncryptedBackupEnvelope,
  type EncryptedBackupEnvelope,
} from './backupCrypto'

export const BACKUP_DATA_KEYS = [
  'tasknest_tasks',
  'tasknest_categories',
  'tasknest_tags',
  'tasknest_workspaces',
] as const

export const BACKUP_FOLDER_NAME = 'DewTask Backups'

export interface PlaintextBackupPayload {
  application: 'DewTask' | 'TaskNest'
  backupVersion: 1
  exportedAt: string
  tasknest_tasks: unknown[]
  tasknest_categories: unknown[]
  tasknest_tags: unknown[]
  tasknest_workspaces: unknown[]
  tasknest_settings: TaskNestSettings
  tasknest_notifications: unknown[]
}

export type InspectedBackup =
  | { kind: 'encrypted'; envelope: EncryptedBackupEnvelope }
  | { kind: 'plaintext'; data: Record<string, unknown> }

export interface ExportBackupResult {
  filename: string
  savedPath: string
  encrypted: boolean
  exportedAt: string
}

function formatBackupTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`
}

export async function getDefaultBackupDirectory(): Promise<string> {
  if (isTauri()) {
    const docs = await documentDir()
    return join(docs, BACKUP_FOLDER_NAME)
  }
  if (Capacitor.isNativePlatform()) {
    return `Documents/${BACKUP_FOLDER_NAME}`
  }
  return 'Browser Downloads folder'
}

function downloadFileInBrowser(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  window.setTimeout(() => {
    link.remove()
    URL.revokeObjectURL(url)
  }, 150)
}

export async function exportDewTaskBackup(options: {
  encrypt: boolean
  passphrase?: string
}): Promise<ExportBackupResult> {
  const stored = await readAllStorage()
  const now = new Date()
  const exportedAt = now.toISOString()
  const filename = `dewtask_backup_${formatBackupTimestamp(now)}.dewbackup`

  const payload: PlaintextBackupPayload = {
    application: 'DewTask',
    backupVersion: 1,
    exportedAt,
    tasknest_tasks: Array.isArray(stored.tasknest_tasks) ? stored.tasknest_tasks : [],
    tasknest_categories: Array.isArray(stored.tasknest_categories) ? stored.tasknest_categories : [],
    tasknest_tags: Array.isArray(stored.tasknest_tags) ? stored.tasknest_tags : [],
    tasknest_workspaces: Array.isArray(stored.tasknest_workspaces) ? stored.tasknest_workspaces : [],
    tasknest_settings: (stored.tasknest_settings as TaskNestSettings) ?? DEFAULT_SETTINGS,
    tasknest_notifications: Array.isArray(stored.tasknest_notifications)
      ? stored.tasknest_notifications
      : [],
  }

  const serializedContent = options.encrypt
    ? JSON.stringify(
        await encryptBackupPayload(JSON.stringify(payload), options.passphrase ?? ''),
        null,
        2,
      )
    : JSON.stringify(payload, null, 2)

  if (isTauri()) {
    const backupDir = await getDefaultBackupDirectory()
    await mkdir(backupDir, { recursive: true })
    const fullPath = await join(backupDir, filename)
    await writeTextFile(fullPath, serializedContent)

    return {
      filename,
      savedPath: fullPath,
      encrypted: options.encrypt,
      exportedAt,
    }
  }

  downloadFileInBrowser(serializedContent, filename)

  return {
    filename,
    savedPath: `Downloads/${filename}`,
    encrypted: options.encrypt,
    exportedAt,
  }
}

export async function pickAndReadNativeBackupFile(): Promise<{
  fileName: string
  filePath: string
  content: string
} | null> {
  if (!isTauri()) return null

  const backupDir = await getDefaultBackupDirectory()
  await mkdir(backupDir, { recursive: true }).catch(() => {
    // Ignore if directory cannot be pre-created; dialog will still open cleanly
  })

  const selected = await openDialog({
    title: 'Select DewTask backup file',
    defaultPath: backupDir,
    multiple: false,
    directory: false,
    filters: [
      { name: 'DewTask Backup', extensions: ['dewbackup', 'json'] },
    ],
  })

  if (!selected || Array.isArray(selected)) {
    return null
  }

  const content = await readTextFile(selected)
  const fileName = selected.split(/[/\\]/).pop() ?? selected

  return {
    fileName,
    filePath: selected,
    content,
  }
}

export function inspectBackupFile(rawText: string): InspectedBackup {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    throw new Error('This file is not valid JSON and cannot be restored.')
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('This is not a valid backup file.')
  }

  if (isEncryptedBackupEnvelope(parsed)) {
    return { kind: 'encrypted', envelope: parsed }
  }

  const record = parsed as Record<string, unknown>
  if (!(record.application === 'DewTask' || record.application === 'TaskNest')) {
    throw new Error(
      'This backup does not appear to be from DewTask or an earlier TaskNest version.',
    )
  }

  return { kind: 'plaintext', data: record }
}

export async function decryptAndParseEnvelope(
  envelope: EncryptedBackupEnvelope,
  passphrase: string,
): Promise<Record<string, unknown>> {
  const plaintext = await decryptBackupPayload(envelope, passphrase)
  let parsed: unknown
  try {
    parsed = JSON.parse(plaintext)
  } catch {
    throw new Error('Decrypted backup payload is malformed.')
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Decrypted backup payload is invalid.')
  }

  return parsed as Record<string, unknown>
}

export function validateBackupPayload(
  backup: Record<string, unknown>,
): {
  tasknest_tasks: unknown[]
  tasknest_categories: unknown[]
  tasknest_tags: unknown[]
  tasknest_workspaces: unknown[]
  tasknest_settings: TaskNestSettings
  tasknest_notifications: unknown[]
} {
  if (!BACKUP_DATA_KEYS.every((key) => Array.isArray(backup[key]))) {
    throw new Error(
      'Backup is incomplete. Tasks, categories, tags and workspaces must all be present.',
    )
  }

  const rawSettings = backup[SETTINGS_STORAGE_KEY]
  if (!rawSettings || typeof rawSettings !== 'object' || Array.isArray(rawSettings)) {
    throw new Error('The backup contains invalid settings.')
  }

  const restoredSettings: TaskNestSettings = {
    ...DEFAULT_SETTINGS,
    ...(rawSettings as Partial<TaskNestSettings>),
  }

  return {
    tasknest_tasks: backup.tasknest_tasks as unknown[],
    tasknest_categories: backup.tasknest_categories as unknown[],
    tasknest_tags: backup.tasknest_tags as unknown[],
    tasknest_workspaces: backup.tasknest_workspaces as unknown[],
    tasknest_settings: restoredSettings,
    tasknest_notifications: Array.isArray(backup.tasknest_notifications)
      ? backup.tasknest_notifications
      : [],
  }
}

export async function restoreValidatedBackup(
  backup: Record<string, unknown>,
): Promise<void> {
  const validated = validateBackupPayload(backup)
  await replaceAllStorage(validated)
}