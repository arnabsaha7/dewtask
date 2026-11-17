import { useEffect, useRef, useState } from 'react'

import type { ChangeEvent, ReactNode } from 'react'

import {

  Download, Upload, Trash2, AlertTriangle,
  HardDrive, ShieldCheck, Bell, Settings as SettingsIcon,
  Folder, Tags, Layers, SlidersHorizontal, ListTodo, RefreshCw,
  Compass, Sparkles, CheckCircle2,

} from 'lucide-react'

import {

  SETTINGS_STORAGE_KEY,

  type TaskNestSettings,

} from '../../hooks/useSettings'

import { themes, SYSTEM_THEME_ID } from '../../themes/registry'
import { APP_VERSION } from '../../data/releaseNotes'
import { Capacitor } from '@capacitor/core'
import { isTauri } from '@tauri-apps/api/core'
import { getVersion } from '@tauri-apps/api/app'
import type { AppUpdaterControls } from '../../hooks/useAppUpdater'
import {
  isPermissionGranted as isTauriNotificationPermissionGranted,
  requestPermission as requestTauriNotificationPermission,
  sendNotification as sendTauriNotification,
} from '@tauri-apps/plugin-notification'
import { LocalNotifications } from '@capacitor/local-notifications'
import { clearStorage, storageRecordExists, type StorageKey } from '../../utils/storage'
import {
  BACKUP_DATA_KEYS,
  decryptAndParseEnvelope,
  exportDewTaskBackup,
  inspectBackupFile,
  pickAndReadNativeBackupFile,
  restoreValidatedBackup,
  validateBackupPayload,
  type ExportBackupResult,
} from '../../utils/backupService'
import type { EncryptedBackupEnvelope } from '../../utils/backupCrypto'
import BackupPassphraseModal from './BackupPassphraseModal'
import SyncSettingsSection from './SyncSettingsSection'

type Section = 'general' | 'appearance' | 'tasks' | 'notifications' | 'sync' | 'data' | 'about'

type UpdateSetting = <K extends keyof TaskNestSettings>(

  key: K,

  value: TaskNestSettings[K],

) => void

interface Props {

  section: Section

  settings: TaskNestSettings

  updateSetting: UpdateSetting

  onNotice: (message: string) => void

  updater: AppUpdaterControls

}

type BackupModalState =
  | { mode: 'export' }
  | { mode: 'import'; encrypted: true; envelope: EncryptedBackupEnvelope; fileName?: string }
  | { mode: 'import'; encrypted: false; data: Record<string, unknown>; fileName?: string }

const DATA_KEYS = BACKUP_DATA_KEYS

const cardClass = 'rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface)] p-5 shadow-sm sm:p-6'

const fieldClass = 'w-full rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] px-3.5 py-2.5 text-sm text-[var(--tn-text)] outline-none transition hover:border-[var(--tn-border)] focus:border-[var(--tn-primary)] focus:ring-2 focus:ring-[var(--tn-primary)]/20'

const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface)] px-4 py-2.5 text-sm font-medium text-[var(--tn-text)] transition hover:border-[var(--tn-border)] hover:bg-[var(--tn-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50'

const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--tn-primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--tn-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50'

function Heading({ title, description }: { title: string; description: string }) {

  return <div className="mb-3"><h3 className="text-sm font-semibold text-[var(--tn-text)]">{title}</h3><p className="mt-1 text-xs leading-5 text-[var(--tn-text-subtle)]">{description}</p></div>

}

function Card({ children }: { children: ReactNode }) {

  return <div className={cardClass}>{children}</div>

}

function Row({ title, description, children }: { title: string; description: string; children: ReactNode }) {

  return (

    <div className="flex flex-col gap-3 border-b border-[var(--tn-border)] py-5 first:pt-0 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">

      <div><p className="text-sm font-medium text-[var(--tn-text)]">{title}</p><p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--tn-text-subtle)]">{description}</p></div>

      <div className="w-full sm:w-60 sm:shrink-0">{children}</div>

    </div>

  )

}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (value: boolean) => void }) {

  return (

    <button type="button" role="switch" aria-label={label} aria-checked={checked} onClick={() => onChange(!checked)}

      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-[var(--tn-primary)]/40 ${checked ? 'bg-[var(--tn-primary)]' : 'bg-[var(--tn-border)]'}`}>

      <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />

    </button>

  )

}

export default function SettingsSections({ section, settings, updateSetting, onNotice, updater }: Props) {

  const [appVersion, setAppVersion] = useState('')
  useEffect(() => {
    if (!isTauri()) return
    void getVersion().then(setAppVersion).catch((error) => {
      console.error('Could not read DewTask version:', error)
    })
  }, [])

  const fileInput = useRef<HTMLInputElement>(null)

  const [importError, setImportError] = useState('')
  const [encryptOnExport, setEncryptOnExport] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [lastBackupResult, setLastBackupResult] = useState<ExportBackupResult | null>(null)
  const [restoreSuccessMessage, setRestoreSuccessMessage] = useState('')
  const [passphraseModal, setPassphraseModal] = useState<BackupModalState | null>(null)
  const [storageStatus, setStorageStatus] = useState<Record<string, boolean>>({})
  const [notificationPermission, setNotificationPermission] = useState<string>(() => typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported')

  useEffect(() => {
    if (section !== 'notifications') return
    let cancelled = false
    const refreshPermission = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const permission = await LocalNotifications.checkPermissions()
          if (!cancelled) setNotificationPermission(permission.display)
        } else if (isTauri()) {
          const granted = await isTauriNotificationPermissionGranted()
          if (!cancelled) setNotificationPermission(granted ? 'granted' : 'prompt')
        } else if (typeof window !== 'undefined' && 'Notification' in window) {
          setNotificationPermission(Notification.permission)
        } else {
          setNotificationPermission('unsupported')
        }
      } catch {
        if (!cancelled) setNotificationPermission('unsupported')
      }
    }
    void refreshPermission()
    return () => { cancelled = true }
  }, [section])

  useEffect(() => {
    let cancelled = false
    const keys: StorageKey[] = [...DATA_KEYS, SETTINGS_STORAGE_KEY, 'tasknest_notifications']
    Promise.all(keys.map(async (key) => [key, await storageRecordExists(key)] as const))
      .then((entries) => { if (!cancelled) setStorageStatus(Object.fromEntries(entries)) })
      .catch((error) => console.error('Could not inspect local storage:', error))
    return () => { cancelled = true }
  }, [section])

  const handleExportClick = async () => {
    setImportError('')
    setRestoreSuccessMessage('')

    if (encryptOnExport) {
      setPassphraseModal({ mode: 'export' })
      return
    }

    setIsExporting(true)
    try {
      const result = await exportDewTaskBackup({ encrypt: false })
      setLastBackupResult(result)
      onNotice(`Backup saved to ${result.savedPath}`)
    } catch (error) {
      console.error('Failed to export DewTask data:', error)
      setImportError(
        error instanceof Error
          ? error.message
          : 'Could not export your backup. Please try again.',
      )
    } finally {
      setIsExporting(false)
    }
  }

  const processBackupContent = (rawText: string, fileName?: string) => {
    const inspected = inspectBackupFile(rawText)

    if (inspected.kind === 'encrypted') {
      setPassphraseModal({
        mode: 'import',
        encrypted: true,
        envelope: inspected.envelope,
        fileName,
      })
      return
    }

    validateBackupPayload(inspected.data)
    setPassphraseModal({
      mode: 'import',
      encrypted: false,
      data: inspected.data,
      fileName,
    })
  }

  const handleImportClick = async () => {
    setImportError('')
    setRestoreSuccessMessage('')

    if (isTauri()) {
      setIsImporting(true)
      try {
        const picked = await pickAndReadNativeBackupFile()
        if (!picked) return
        processBackupContent(picked.content, picked.fileName)
      } catch (error) {
        setImportError(
          error instanceof Error ? error.message : 'Unable to import this backup.',
        )
      } finally {
        setIsImporting(false)
      }
      return
    }

    fileInput.current?.click()
  }

  const handlePassphraseSubmit = async (passphrase: string) => {
    if (!passphraseModal) return

    if (passphraseModal.mode === 'export') {
      const result = await exportDewTaskBackup({ encrypt: true, passphrase })
      setLastBackupResult(result)
      setPassphraseModal(null)
      onNotice(`Encrypted backup saved to ${result.savedPath}`)
      return
    }

    const targetName = passphraseModal.fileName
    const backupData = passphraseModal.encrypted
      ? await decryptAndParseEnvelope(passphraseModal.envelope, passphrase)
      : passphraseModal.data

    validateBackupPayload(backupData)
    await restoreValidatedBackup(backupData)
    setPassphraseModal(null)
    setRestoreSuccessMessage(
      `${passphraseModal.encrypted ? 'Encrypted backup' : 'Backup'}${targetName ? ` (${targetName})` : ''} restored successfully. Reloading DewTask…`,
    )
    onNotice('Backup restored. Reloading DewTask...')
    window.setTimeout(() => window.location.reload(), 800)
  }

  const importData = async (event: ChangeEvent<HTMLInputElement>) => {

    const file = event.target.files?.[0]

    if (!file) return

    setImportError('')
    setRestoreSuccessMessage('')

    try {
      processBackupContent(await file.text(), file.name)
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Unable to import this backup.')
    } finally {
      event.target.value = ''
    }

  }

  const clearData = async () => {

    if (!window.confirm('Permanently delete all DewTask tasks, categories, tags, workspaces, notifications and preferences from this device? This cannot be undone.')) return

    void clearStorage().then(() => window.location.reload()).catch((error) => {
      console.error('Failed to clear DewTask data:', error)
      onNotice('Could not clear local data. Please try again.')
    })

  }

  if (section === 'appearance') return (

    <div className="space-y-6">

      <section>

        <Heading title="Theme" description="Choose the look and feel of DewTask. Your selection is saved on this device." />

        <Card>

          <div className="max-w-2xl">

            <label htmlFor="tasknest-theme" className="mb-2 block text-sm font-medium text-[var(--tn-text)]">App theme</label>

            <select

              id="tasknest-theme"

              className={fieldClass}

              value={settings.themeId}

              onChange={(event) => updateSetting('themeId', event.target.value)}

            >

              <option value={SYSTEM_THEME_ID}>System (follow device setting)</option>

              <optgroup label="Light themes">
                {themes
                  .filter((theme) => theme.mode === 'light')
                  .map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.name}
                    </option>
                  ))}
              </optgroup>

              <optgroup label="Dark themes">
                {themes
                  .filter((theme) => theme.mode === 'dark')
                  .map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.name}
                    </option>
                  ))}
              </optgroup>
            </select>

            <p className="mt-2 text-xs leading-5 text-[var(--tn-text-muted)]">

              {settings.themeId === SYSTEM_THEME_ID

                ? 'DewTask automatically switches between light and dark based on your operating system.'

                : `${themes.find((theme) => theme.id === settings.themeId)?.description ?? 'Selected theme.'} Theme changes apply across DewTask.`}

            </p>

          </div>

        </Card>

      </section>

    </div>

  )

  if (section === 'general') return (

    <section><Heading title="Regional preferences" description="Set the date and calendar conventions used throughout DewTask." /><Card>

      <Row title="Date format" description="Choose how dates should be displayed.">

        <select className={fieldClass} value={settings.dateFormat} onChange={(e) => updateSetting('dateFormat', e.target.value as TaskNestSettings['dateFormat'])}>

          <option value="DD/MM/YYYY">DD/MM/YYYY</option><option value="MM/DD/YYYY">MM/DD/YYYY</option><option value="YYYY-MM-DD">YYYY-MM-DD</option>

        </select>

      </Row>

      <Row title="Start of week" description="Choose the first day shown in calendar-based views.">

        <select className={fieldClass} value={settings.startOfWeek} onChange={(e) => updateSetting('startOfWeek', e.target.value as TaskNestSettings['startOfWeek'])}>

          <option value="monday">Monday</option><option value="sunday">Sunday</option>

        </select>

      </Row>

    </Card></section>

  )

  if (section === 'tasks') return (

    <section><Heading title="Task display" description="Choose the default way tasks are presented in your workspace." /><Card>

      <Row title="Default view" description="Choose whether task pages open in list or board layout.">

        <select className={fieldClass} value={settings.defaultView} onChange={(e) => updateSetting('defaultView', e.target.value as TaskNestSettings['defaultView'])}>

          <option value="list">List view</option><option value="board">Kanban board</option>

        </select>

      </Row>

      <Row title="Default sorting" description="Choose the initial order used when displaying tasks.">

        <select className={fieldClass} value={settings.defaultSort} onChange={(e) => updateSetting('defaultSort', e.target.value as TaskNestSettings['defaultSort'])}>

          <option value="created">Recently created</option><option value="dueDate">Due date</option><option value="priority">Priority</option><option value="title">Title</option>

        </select>

      </Row>

      <Row title="Show completed tasks" description="Keep completed tasks visible in task views.">

        <div className="flex justify-start sm:justify-end"><Toggle checked={settings.showCompletedTasks} label="Show completed tasks" onChange={(value) => updateSetting('showCompletedTasks', value)} /></div>

      </Row>

    </Card></section>

  )

  if (section === 'notifications') return (
    <div className="space-y-6">
      <section>
        <Heading title="Reminder preferences" description="Choose which task alerts DewTask should create." />
        <Card>
          <Row title="Enable reminders" description="Master switch for individual reminders and automatic deadline alerts.">
            <div className="flex justify-start sm:justify-end"><Toggle checked={settings.remindersEnabled} label="Enable reminders" onChange={(value) => updateSetting('remindersEnabled', value)} /></div>
          </Row>
          <Row title="Deadline-day alerts" description="Notify you on the due date at the time selected below.">
            <div className="flex justify-start sm:justify-end"><Toggle checked={settings.automaticDueDateReminders} label="Deadline-day alerts" onChange={(value) => updateSetting('automaticDueDateReminders', value)} /></div>
          </Row>
          <Row title="Daily overdue alerts" description="Repeat an alert each day for unfinished tasks past their due date.">
            <div className="flex justify-start sm:justify-end"><Toggle checked={settings.automaticOverdueReminders} label="Daily overdue alerts" onChange={(value) => updateSetting('automaticOverdueReminders', value)} /></div>
          </Row>
          <Row title="Alert time" description="Local device time used for automatic deadline and overdue alerts.">
            <input type="time" aria-label="Deadline alert time" value={settings.deadlineReminderTime || '09:00'} onChange={(event) => updateSetting('deadlineReminderTime', event.target.value)} className={fieldClass} />
          </Row>
        </Card>
      </section>
      <section>
        <Heading title="System notifications" description="Allow DewTask to show system notifications on this device." />
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--tn-text)]">Permission status</p>
              <p className="mt-1 text-xs text-[var(--tn-text-subtle)]">{notificationPermission === 'unsupported' ? 'This environment does not expose the browser notification API.' : notificationPermission === 'granted' ? 'System notifications are allowed.' : notificationPermission === 'denied' ? 'Notifications are blocked in system settings. Enable them in Windows Settings.' : 'Permission has not been requested.'}</p>
            </div>
            <button type="button" disabled={notificationPermission === 'unsupported' || notificationPermission === 'denied' || notificationPermission === 'granted'} onClick={async () => {
              try {
                if (Capacitor.isNativePlatform()) {
                  const permission = await LocalNotifications.requestPermissions()
                  setNotificationPermission(permission.display)
                  if (permission.display === 'granted') window.dispatchEvent(new Event('focus'))
                  onNotice(permission.display === 'granted' ? 'System notifications enabled.' : 'System notification permission was not granted.')
                } else if (isTauri()) {
                  const permission = await requestTauriNotificationPermission()
                  setNotificationPermission(permission)
                  if (permission === 'granted') {
                    sendTauriNotification({
                      title: 'DewTask notifications enabled',
                      body: 'DewTask can now notify you about task reminders and deadlines.',
                    })
                    window.dispatchEvent(new Event('focus'))
                  }
                  onNotice(permission === 'granted' ? 'System notifications enabled.' : 'System notification permission was not granted.')
                } else if ('Notification' in window) {
                  const permission = await Notification.requestPermission()
                  setNotificationPermission(permission)
                  onNotice(permission === 'granted' ? 'System notifications enabled.' : 'System notification permission was not granted.')
                }
              } catch (error) {
                console.error('Could not request notification permission:', error)
                onNotice('Could not enable system notifications on this device.')
              }
            }} className={primaryButton}>{notificationPermission === 'granted' ? 'Enabled' : notificationPermission === 'denied' ? 'Blocked in system settings' : 'Enable system notifications'}</button>
          </div>
        </Card>
      </section>
      <div className="flex items-start gap-3 rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] p-4">
        <Bell size={17} className="mt-0.5 shrink-0 text-[var(--tn-primary)]" />
        <p className="text-xs leading-5 text-[var(--tn-text-muted)]">
          Set reminders for individual tasks. Notifications work even when DewTask is closed on Android and iOS; on Windows and web, DewTask must be running.
        </p>      
      </div>
    </div>
  )

  if (section === 'sync') return <SyncSettingsSection />

  if (section === 'data') {


    return (

      <div className="space-y-6">

        <section>
          <Heading
            title="Backup and restore"
            description="Keep a portable copy of your DewTask workspace or restore it from a backup."
          />
          <Card>
            <div className="space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface-muted)] text-[var(--tn-primary)]">
                  <HardDrive size={18} strokeWidth={1.9} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--tn-text)]">
                    Your DewTask backup
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--tn-text-subtle)]">
                    Export or restore your tasks, workspaces and preferences.
                  </p>
                </div>
              </div>

              {lastBackupResult && (
                <div
                  role="status"
                  className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] p-3.5"
                >
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-emerald-300">
                      {lastBackupResult.encrypted
                        ? 'Encrypted backup created'
                        : 'Backup created'}
                    </p>
                    <p className="mt-1 break-all font-mono text-[11px] leading-5 text-[var(--tn-text-muted)]">
                      {lastBackupResult.savedPath}
                    </p>
                  </div>
                </div>
              )}

              {restoreSuccessMessage && (
                <div
                  role="status"
                  className="flex items-center gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] px-3.5 py-3 text-xs font-medium text-emerald-300"
                >
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                  <span>{restoreSuccessMessage}</span>
                </div>
              )}

              {importError && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300"
                >
                  {importError}
                </p>
              )}

              <div className="flex flex-col gap-3 border-t border-[var(--tn-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex cursor-pointer select-none items-center gap-2.5 text-sm text-[var(--tn-text)]">
                  <input
                    type="checkbox"
                    checked={encryptOnExport}
                    onChange={(e) => setEncryptOnExport(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--tn-border)] accent-[var(--tn-primary)]"
                  />
                  <span>Encrypted backup</span>
                </label>

                <div className="flex flex-wrap items-center justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={isExporting || isImporting}
                    className={`${secondaryButton} min-h-10 whitespace-nowrap px-4`}
                    onClick={handleImportClick}
                  >
                    <Upload size={15} />
                    {isImporting ? 'Opening…' : 'Import backup'}
                  </button>
                  <button
                    type="button"
                    disabled={isExporting || isImporting}
                    className={`${primaryButton} min-h-10 whitespace-nowrap px-4`}
                    onClick={handleExportClick}
                  >
                    <Download size={15} />
                    {isExporting ? 'Exporting…' : 'Export backup'}
                  </button>
                </div>
              </div>
            </div>

            <input
              ref={fileInput}
              type="file"
              accept=".dewbackup,.json,application/json"
              className="hidden"
              onChange={importData}
            />
          </Card>

          <BackupPassphraseModal
            open={passphraseModal !== null}
            mode={passphraseModal?.mode ?? 'export'}
            encrypted={passphraseModal?.mode === 'import' ? passphraseModal.encrypted : true}
            fileName={passphraseModal?.mode === 'import' ? passphraseModal.fileName : undefined}
            exportedAt={
              passphraseModal?.mode === 'import' && passphraseModal.encrypted
                ? passphraseModal.envelope.exportedAt
                : passphraseModal?.mode === 'import' && !passphraseModal.encrypted && typeof passphraseModal.data.exportedAt === 'string'
                  ? passphraseModal.data.exportedAt
                  : undefined
            }
            onClose={() => setPassphraseModal(null)}
            onSubmit={handlePassphraseSubmit}
          />
        </section>

        <section><Heading title="Your local data" description="See what information DewTask saves on this device." /><Card>
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400"><ShieldCheck size={19} /></div>
            <div>
              <p className="text-sm font-medium text-[var(--tn-text)]">Your information stays on this device</p>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--tn-text-subtle)]">DewTask saves your information in this browser. It is not automatically synced to a cloud account, so remember to export a backup if you want to move your data to another device.</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-[var(--tn-border)]">
            {[
              { key: 'tasknest_tasks', label: 'Tasks', description: 'Your task names, details, deadlines and progress', Icon: ListTodo },
              { key: 'tasknest_categories', label: 'Folders & categories', description: 'The folders and categories you use to organise tasks', Icon: Folder },
              { key: 'tasknest_tags', label: 'Tags', description: 'Labels you use to group and find related tasks', Icon: Tags },
              { key: 'tasknest_workspaces', label: 'Workspaces', description: 'Your separate spaces and their organisation', Icon: Layers },
              { key: 'tasknest_notifications', label: 'Notifications', description: 'Your reminder and deadline alert history', Icon: Bell },
              { key: SETTINGS_STORAGE_KEY, label: 'App preferences', description: 'Your theme, date format and other preferences', Icon: SlidersHorizontal },
            ].map(({ key, label, description, Icon }, index) => {
              const exists = storageStatus[key] ?? false
              return (
                <div key={key} className={`flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between ${index ? 'border-t border-[var(--tn-border)]' : ''}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--tn-surface-muted)] text-[var(--tn-text-muted)]">
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--tn-text)]">{label}</p>
                      <p className="mt-0.5 text-xs leading-5 text-[var(--tn-text-subtle)]">{description}</p>
                    </div>
                  </div>
                  <span className={`inline-flex w-fit shrink-0 items-center gap-1.5 pl-12 text-xs sm:pl-0 ${exists ? 'text-emerald-400' : 'text-[var(--tn-text-subtle)]'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${exists ? 'bg-emerald-400' : 'bg-[var(--tn-border)]'}`} />
                    {exists ? 'Saved on this device' : 'Not saved yet'}
                  </span>
                </div>
              )
            })}
          </div>
        </Card></section>
        <section><Heading title="Danger zone" description="Actions here permanently affect data stored in this browser." /><div className="rounded-xl border border-red-500/25 bg-red-500/[0.04] p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><AlertTriangle size={19} className="mt-0.5 shrink-0 text-red-400" /><div><h4 className="text-sm font-semibold text-red-300">Clear all local data</h4><p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--tn-text-muted)]">Permanently delete all DewTask tasks, categories, tags, workspaces and preferences from this device. This cannot be undone.</p></div></div><button type="button" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-500/30 px-4 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/10" onClick={clearData}><Trash2 size={16} />Clear local data</button></div></div></section>

      </div>

    )

  }

  const displayVersion = appVersion || APP_VERSION

  return (

    <section><Heading title="About DewTask" description="Application details and project credits." /><Card>
      <div className="flex items-center gap-4 border-b border-[var(--tn-border)] pb-5"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--tn-primary)]/15 text-[var(--tn-primary)]"><SettingsIcon size={25} /></div><div><h3 className="text-base font-semibold text-[var(--tn-text)]">DewTask</h3><p className="mt-1 text-xs text-[var(--tn-text-subtle)]">Personal task management</p></div></div>
      <div className="divide-y divide-[var(--tn-border)]">
        <div className="flex items-center justify-between gap-4 py-4 text-sm"><span className="text-[var(--tn-text-subtle)]">Application</span><span className="text-[var(--tn-text)]">DewTask</span></div>
        <div className="flex items-center justify-between gap-4 py-4 text-sm"><span className="text-[var(--tn-text-subtle)]">Version</span><span className="text-[var(--tn-text)]">{displayVersion}</span></div>
        <div className="flex items-center justify-between gap-4 py-4 text-sm"><span className="text-[var(--tn-text-subtle)]">Storage</span><span className="text-right text-[var(--tn-text)]">Local storage</span></div>
        <div className="flex items-center justify-between gap-4 py-4 text-sm"><span className="text-[var(--tn-text-subtle)]">Operating mode</span><span className="text-[var(--tn-text)]">Offline-first</span></div>
      </div>

      {isTauri() && (
        <div className="mt-5 rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface-muted)]/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--tn-text)]">Software updates</p>
              <p className="mt-1 text-xs leading-5 text-[var(--tn-text-muted)]">
                {updater.status === 'checking' && 'Checking GitHub for a newer version…'}
                {updater.status === 'idle' && 'Update status has not been checked yet.'}
                {updater.status === 'up-to-date' && 'You are using the latest version of DewTask.'}
                {updater.status === 'available' && `Version ${updater.availableVersion} is available.`}
                {updater.status === 'downloading' && (updater.progress === null ? 'Downloading the update…' : `Downloading update… ${updater.progress}%`)}
                {updater.status === 'installing' && 'The installer is starting. DewTask will close to complete the update.'}
                {updater.status === 'error' && 'The update check or installation could not be completed.'}
                {updater.status === 'unsupported' && 'In-app updates are available in the Windows desktop app.'}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={updater.checkForUpdates}
                disabled={updater.status === 'checking' || updater.status === 'downloading' || updater.status === 'installing'}
                className={secondaryButton}
              >
                <RefreshCw size={15} className={updater.status === 'checking' ? 'animate-spin' : ''} />
                Check for updates
              </button>
              {updater.updateAvailable && (
                <button
                  type="button"
                  onClick={updater.installUpdate}
                  disabled={updater.status === 'downloading' || updater.status === 'installing'}
                  className={primaryButton}
                >
                  <Download size={15} />
                  {updater.status === 'downloading' ? 'Downloading…' : 'Install update'}
                </button>
              )}
            </div>
          </div>
          {updater.status === 'downloading' && updater.progress !== null && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--tn-border)]">
              <div className="h-full rounded-full bg-[var(--tn-primary)] transition-[width]" style={{ width: `${updater.progress}%` }} />
            </div>
          )}
          {updater.error && (
            <p role="alert" className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs leading-5 text-red-300">
              {updater.error}
            </p>
          )}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-[var(--tn-border)] bg-[var(--tn-surface-muted)]/70 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--tn-text)]">Guides &amp; release notes</p>
            <p className="mt-1 text-xs leading-5 text-[var(--tn-text-muted)]">
              Revisit the interactive workspace walkthrough or view the latest highlights.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('tasknest:open-onboarding'))}
              className={secondaryButton}
            >
              <Compass size={15} className="text-[var(--tn-primary)]" />
              User guide
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('tasknest:open-whats-new'))}
              className={secondaryButton}
            >
              <Sparkles size={15} className="text-[var(--tn-primary)]" />
              What’s new (v{displayVersion})
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-[var(--tn-border)] bg-[var(--tn-surface-muted)]/70 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--tn-text-subtle)]">Created by</p>
        <p className="mt-1 text-sm font-semibold text-[var(--tn-text)]">Arnab Saha</p>
        <p className="mt-1 text-xs leading-5 text-[var(--tn-text-subtle)]">Design and development</p>
      </div>
    </Card></section>

  )

}