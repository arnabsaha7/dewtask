import packageJson from '../../package.json'

export const APP_VERSION = packageJson.version

// Match the GitHub repository configured in your Tauri updater
const GITHUB_REPO = 'arnabsaha7/dewtask'
const CACHE_STORAGE_KEY = 'tasknest_release_notes_cache_v2'

export interface ReleaseHighlight {
  badge: 'New' | 'Improved' | 'Fix'
  title?: string
  description: string
}

export interface ReleaseEntry {
  version: string
  date: string
  headline: string
  highlights: ReleaseHighlight[]
}

/**
 * Local fallback notes used when offline or before a GitHub release is published.
 */
export const RELEASE_NOTES: ReleaseEntry[] = [
  {
    version: '1.3.0',
    date: 'November 2026',
    headline: 'Recurring tasks with smart reminder shifting, an interactive user onboarding guide, and automatic release notes.',
    highlights: [
      {
        badge: 'New',
        title: 'Recurring Tasks & Schedules',
        description:
          'Repeat tasks daily, weekly (with custom weekdays), monthly, or yearly. Completing a task automatically schedules the next occurrence and resets its checklist.',
      },
      {
        badge: 'New',
        title: 'Auto-Shifting Reminders',
        description:
          'Task reminders and auto-progression timers automatically shift forward by the exact interval whenever a recurring cycle completes.',
      },
      {
        badge: 'New',
        title: 'Interactive User Onboarding Guide',
        description:
          'Added a 5-step guided walkthrough for new users covering workspaces, nested folders, recurring tasks, views, and task management.',
      },
      {
        badge: 'New',
        title: 'Automatic Release Notes',
        description:
          'DewTask now fetches and displays what\'s new automatically after an update and lets you replay the user guide or release notes anytime from Settings → About.',
      },
    ],
  },
]

function normalizeBadge(raw: string): ReleaseHighlight['badge'] | null {
  const cleaned = raw
    .replace(/[*#:[\]]/g, '')
    .trim()
    .toUpperCase()

  if (
    cleaned === 'NEW' ||
    cleaned === 'NEW FEATURE' ||
    cleaned === 'NEW FEATURES' ||
    cleaned === 'FEATURE' ||
    cleaned === 'FEATURES' ||
    cleaned === 'ADDED' ||
    cleaned === "WHAT'S NEW" ||
    cleaned === 'WHATS NEW'
  ) {
    return 'New'
  }

  if (
    cleaned === 'FIX' ||
    cleaned === 'FIXES' ||
    cleaned === 'FIXED' ||
    cleaned === 'BUG FIX' ||
    cleaned === 'BUG FIXES' ||
    cleaned === 'BUGFIX'
  ) {
    return 'Fix'
  }

  if (
    cleaned === 'IMPROVED' ||
    cleaned === 'IMPROVEMENT' ||
    cleaned === 'IMPROVEMENTS' ||
    cleaned === 'ENHANCED' ||
    cleaned === 'ENHANCEMENTS' ||
    cleaned === 'UPDATED' ||
    cleaned === 'CHANGED' ||
    cleaned === 'CHANGES'
  ) {
    return 'Improved'
  }

  return null
}

/**
 * Parses a GitHub Release Markdown body into structured ReleaseEntry highlights.
 */
export function parseGitHubReleaseBody(
  version: string,
  publishedAt: string | null | undefined,
  body: string,
): ReleaseEntry {
  const dateLabel = publishedAt
    ? new Date(publishedAt).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      })

  const lines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  let headline = ''
  let activeSectionBadge: ReleaseHighlight['badge'] | null = null
  const highlights: ReleaseHighlight[] = []

  const sectionHeaderRegex = /^(?:#{1,6}\s*)?\*{0,2}\[?([A-Za-z' ]+?)\]?\*{0,2}\s*:?\s*$/
  const inlineTaggedRegex = /^(?:[-*+]|\d+[.)])?\s*\[([A-Za-z' ]+)\]\s*:?\s*(.+)$/
  const listItemRegex = /^(?:[-*+]|\d+[.)])\s+(.+)$/

  const splitTitleAndDesc = (
    rawText: string,
  ): { title?: string; description: string } => {
    const cleaned = rawText.replace(/\*{1,2}/g, '').trim()

    // 1. Prioritize a colon separator (allows hyphens like "Auto-Shifting" in titles)
    const colonMatch = cleaned.match(/^([^:]+?):\s+(.+)$/)
    if (colonMatch) {
      return {
        title: colonMatch[1].trim(),
        description: colonMatch[2].trim(),
      }
    }

    // 2. Fallback to spaced dash separators (e.g. "Title - Description")
    const dashMatch = cleaned.match(/^(.+?)\s+[–—-]\s+(.+)$/)
    if (dashMatch) {
      return {
        title: dashMatch[1].trim(),
        description: dashMatch[2].trim(),
      }
    }

    return {
      description: cleaned,
    }
  }

  for (const line of lines) {
    const sectionMatch = line.match(sectionHeaderRegex)
    if (sectionMatch) {
      const detected = normalizeBadge(sectionMatch[1])
      if (detected) {
        activeSectionBadge = detected
        continue
      }
    }

    const inlineMatch = line.match(inlineTaggedRegex)
    if (inlineMatch) {
      const badge = normalizeBadge(inlineMatch[1]) ?? 'Improved'
      const { title, description } = splitTitleAndDesc(inlineMatch[2])
      highlights.push({ badge, title, description })
      continue
    }

    const listMatch = line.match(listItemRegex)
    if (listMatch) {
      const badge = activeSectionBadge ?? 'Improved'
      const { title, description } = splitTitleAndDesc(listMatch[1])
      highlights.push({ badge, title, description })
      continue
    }

    if (line.startsWith('#')) continue

    if (!headline) {
      headline = line.replace(/\*{1,2}/g, '').trim()
    }
  }

  const fallbackHighlights =
    RELEASE_NOTES.find((entry) => entry.version === version)?.highlights ??
    RELEASE_NOTES[0]?.highlights ??
    []

  return {
    version,
    date: dateLabel,
    headline: headline || `What’s new in DewTask v${version}.`,
    highlights: highlights.length > 0 ? highlights : fallbackHighlights,
  }
}

function readCachedRelease(version: string): ReleaseEntry | null {
  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY)
    if (!raw) return null
    const cache = JSON.parse(raw) as Record<string, ReleaseEntry>
    return cache[version] ?? null
  } catch {
    return null
  }
}

function writeCachedRelease(entry: ReleaseEntry): void {
  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY)
    const cache = raw ? (JSON.parse(raw) as Record<string, ReleaseEntry>) : {}
    cache[entry.version] = entry
    window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache))
  } catch {
    // Ignore storage quota errors
  }
}

export function getReleaseForVersion(version: string): ReleaseEntry {
  return (
    readCachedRelease(version) ??
    RELEASE_NOTES.find((entry) => entry.version === version) ?? {
      version,
      date: new Date().toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      }),
      headline: `DewTask has been updated to v${version}.`,
      highlights: RELEASE_NOTES[0]?.highlights ?? [],
    }
  )
}

/**
 * Fetches release notes for `version` from GitHub Releases (trying `v<version>` then `<version>`),
 * caches the parsed result locally, and falls back to bundled notes if offline.
 */
export async function fetchReleaseForVersion(
  version: string,
  signal?: AbortSignal,
): Promise<ReleaseEntry> {
  const cached = readCachedRelease(version)
  if (cached) return cached

  const candidateTags = [`v${version}`, version]

  for (const tag of candidateTags) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/releases/tags/${encodeURIComponent(tag)}`,
        {
          headers: { Accept: 'application/vnd.github+json' },
          signal,
        },
      )

      if (!response.ok) continue

      const data = (await response.json()) as {
        body?: string
        published_at?: string
      }

      if (data.body && data.body.trim().length > 0) {
        const parsed = parseGitHubReleaseBody(
          version,
          data.published_at,
          data.body,
        )
        writeCachedRelease(parsed)
        return parsed
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') throw error
    }
  }

  return getReleaseForVersion(version)
}