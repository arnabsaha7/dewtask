
import packageJson from '../../package.json'

export const APP_VERSION = packageJson.version

// GitHub repository configured in the Tauri updater
const GITHUB_REPO = 'arnabsaha7/dewtask'
const CACHE_STORAGE_KEY = 'dewtask_release_notes_cache_v3'

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
 * Normalizes GitHub release section headings.
 */
function normalizeBadge(raw: string): ReleaseHighlight['badge'] | null {
  const cleaned = raw
    .replace(/[*#:[\]]/g, '')
    .trim()
    .toUpperCase()

  if (
    ['NEW', 'NEW FEATURE', 'NEW FEATURES', 'FEATURE', 'FEATURES',
      'ADDED', "WHAT'S NEW", 'WHATS NEW'].includes(cleaned)
  ) {
    return 'New'
  }

  if (
    ['FIX', 'FIXES', 'FIXED', 'BUG FIX', 'BUG FIXES', 'BUGFIX'].includes(cleaned)
  ) {
    return 'Fix'
  }

  if (
    ['IMPROVED', 'IMPROVEMENT', 'IMPROVEMENTS', 'ENHANCED',
      'ENHANCEMENTS', 'UPDATED', 'CHANGED', 'CHANGES'].includes(cleaned)
  ) {
    return 'Improved'
  }

  return null
}

/**
 * Parses a GitHub Release Markdown body into structured release notes.
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
    : 'Date unavailable'

  const lines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  let headline = ''
  let activeSectionBadge: ReleaseHighlight['badge'] | null = null

  const highlights: ReleaseHighlight[] = []

  const sectionHeaderRegex =
    /^(?:#{1,6}\s*)?\*{0,2}\[?([A-Za-z' ]+?)\]?\*{0,2}\s*:?\s*$/

  const inlineTaggedRegex =
    /^(?:[-*+]|\d+[.)])?\s*\[([A-Za-z' ]+)\]\s*:?\s*(.+)$/

  const listItemRegex = /^(?:[-*+]|\d+[.)])\s+(.+)$/

  const splitTitleAndDesc = (
    rawText: string,
  ): { title?: string; description: string } => {
    const cleaned = rawText.replace(/\*{1,2}/g, '').trim()

    const colonMatch = cleaned.match(/^([^:]+?):\s+(.+)$/)

    if (colonMatch) {
      return {
        title: colonMatch[1].trim(),
        description: colonMatch[2].trim(),
      }
    }

    const dashMatch = cleaned.match(/^(.+?)\s+[–—-]\s+(.+)$/)

    if (dashMatch) {
      return {
        title: dashMatch[1].trim(),
        description: dashMatch[2].trim(),
      }
    }

    return { description: cleaned }
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

  return {
    version,
    date: dateLabel,
    headline: headline || `What's new in DewTask v${version}.`,
    highlights,
  }
}

/**
 * Reads cached release notes.
 */
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

/**
 * Stores release notes locally for offline access.
 */
function writeCachedRelease(entry: ReleaseEntry): void {
  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY)

    const cache = raw
      ? (JSON.parse(raw) as Record<string, ReleaseEntry>)
      : {}

    cache[entry.version] = entry

    window.localStorage.setItem(
      CACHE_STORAGE_KEY,
      JSON.stringify(cache),
    )
  } catch {
    // Ignore storage errors.
  }
}

/**
 * Returns a cached release or a generic fallback.
 * No bundled or hardcoded release notes.
 */
export function getReleaseForVersion(version: string): ReleaseEntry {
  return (
    readCachedRelease(version) ?? {
      version,
      date: 'Date unavailable',
      headline: `DewTask has been updated to v${version}.`,
      highlights: [],
    }
  )
}

/**
 * Fetches release notes from GitHub Releases.
 * Uses cached notes when offline.
 */
export async function fetchReleaseForVersion(
  version: string,
  signal?: AbortSignal,
): Promise<ReleaseEntry> {
  // Normalize so "1.2.0" and "v1.2.0" both resolve to the tag "v1.2.0"
  const cleanVersion = version.replace(/^v/i, '')
  const tag = `v${cleanVersion}`

  const cached = readCachedRelease(cleanVersion)

  if (cached) return cached

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/tags/${encodeURIComponent(tag)}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
        },
        signal,
      },
    )

    if (response.ok) {
      const data = (await response.json()) as {
        body?: string | null
        published_at?: string | null
        tag_name?: string
      }

      const parsed = parseGitHubReleaseBody(
        cleanVersion,
        data.published_at,
        data.body ?? '',
      )

      writeCachedRelease(parsed)

      return parsed
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw error
    }
  }

  return getReleaseForVersion(cleanVersion)
}