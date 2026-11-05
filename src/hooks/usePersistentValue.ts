import { useEffect, useRef, useState } from 'react'
import { readStorage, writeStorage, type StorageKey } from '../utils/storage'

/** Loads legacy values immediately for a smooth upgrade, then hydrates IndexedDB. */
export function usePersistentValue<T>(key: StorageKey, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw !== null) return JSON.parse(raw) as T
    } catch (error) {
      console.error(`Could not read legacy ${key}:`, error)
    }
    return fallback
  })
  const hydrated = useRef(false)
  const latestValue = useRef(value)
  latestValue.current = value

  useEffect(() => {
    let cancelled = false
    readStorage<T>(key).then((stored) => {
      if (cancelled) return
      if (stored !== null) setValue(stored)
      hydrated.current = true
      // Persist the current state after hydration; this also seeds first-run defaults.
      void writeStorage(key, stored !== null ? stored : latestValue.current).catch((error) => {
        console.error(`Could not initialize ${key}:`, error)
      })
    }).catch((error) => {
      console.error(`Could not load ${key} from local database:`, error)
      hydrated.current = true
    })
    return () => { cancelled = true }
  }, [key])

  useEffect(() => {
    if (!hydrated.current) return
    void writeStorage(key, value).catch((error) => console.error(`Could not save ${key}:`, error))
  }, [key, value])

  return [value, setValue] as const
}
