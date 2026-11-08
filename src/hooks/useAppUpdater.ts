import { useCallback, useEffect, useState } from 'react'
import { isTauri } from '@tauri-apps/api/core'
import { check } from '@tauri-apps/plugin-updater'

type AvailableUpdate = NonNullable<Awaited<ReturnType<typeof check>>>

export type AppUpdaterStatus =
  | 'idle'
  | 'unsupported'
  | 'checking'
  | 'up-to-date'
  | 'available'
  | 'downloading'
  | 'installing'
  | 'error'

export interface AppUpdaterControls {
  status: AppUpdaterStatus
  availableVersion: string | null
  progress: number | null
  error: string | null
  updateAvailable: boolean
  checkForUpdates: () => void
  installUpdate: () => void
}

/** Checks for signed desktop releases once at launch and exposes manual controls. */
export function useAppUpdater(): AppUpdaterControls {
  const [update, setUpdate] = useState<AvailableUpdate | null>(null)
  const [status, setStatus] = useState<AppUpdaterStatus>(
    isTauri() ? 'idle' : 'unsupported',
  )
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const checkForUpdates = useCallback(async () => {
    if (!isTauri()) {
      setStatus('unsupported')
      return
    }

    setStatus('checking')
    setError(null)
    setProgress(null)

    try {
      const nextUpdate = await check()
      setUpdate(nextUpdate)
      setStatus(nextUpdate ? 'available' : 'up-to-date')
    } catch (checkError) {
      console.error('TaskNest update check failed:', checkError)
      setUpdate(null)
      setStatus('error')
      setError(
        checkError instanceof Error
          ? checkError.message
          : 'Could not check for updates. Please try again later.',
      )
    }
  }, [])

  const installUpdate = useCallback(async () => {
    if (!update || !isTauri()) return

    setStatus('downloading')
    setProgress(0)
    setError(null)

    let downloadedBytes = 0
    let totalBytes: number | undefined

    try {
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          totalBytes = event.data.contentLength
          setProgress(0)
        } else if (event.event === 'Progress') {
          downloadedBytes += event.data.chunkLength
          if (totalBytes && totalBytes > 0) {
            setProgress(
              Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)),
            )
          }
        } else if (event.event === 'Finished') {
          setProgress(100)
        }
      })

      // Windows closes the running app automatically when the NSIS updater starts.
      setStatus('installing')
    } catch (installError) {
      console.error('TaskNest update installation failed:', installError)
      setStatus('error')
      setError(
        installError instanceof Error
          ? installError.message
          : 'The update could not be installed. Please try again.',
      )
    }
  }, [update])

  useEffect(() => {
    if (!isTauri()) return

    // Delay the request slightly so the main window can finish rendering first.
    const timeoutId = window.setTimeout(() => {
      void checkForUpdates()
    }, 1500)

    return () => window.clearTimeout(timeoutId)
  }, [checkForUpdates])

  return {
    status,
    availableVersion: update?.version ?? null,
    progress,
    error,
    updateAvailable: update !== null,
    checkForUpdates: () => void checkForUpdates(),
    installUpdate: () => void installUpdate(),
  }
}
