import packageJson from '../../package.json'

export const APP_VERSION: string = packageJson.version ?? '1.2.2'

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
    version: '1.2.2',
    date: 'November 2026',
    headline: 'Recurring tasks, smart reminder shifting, and onboarding guide.',
    highlights: [
      {
        badge: 'New',
        title: 'Recurring Tasks & Auto-Shifting Reminders',
        description:
          'Repeat tasks daily, weekly (with custom weekdays), monthly, or yearly. Completing a task automatically schedules the next cycle and shifts its reminder.',
      },
      {
        badge: 'New',
        title: 'Interactive Onboarding & Upgrade Guides',
        description:
          'Step-by-step workspace walkthrough for new users and automatic release summaries whenever DewTask updates.',
      },
      {
        badge: 'Improved',
        title: 'Multi-Platform Notification Sync',
        description:
          'Recurring schedules now display directly inside desktop, mobile, and in-app notification alerts.',
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
 * Supports:
 * - Natural or bracketed headers: `New Feature:`, `### Bug Fixes`, `[New]:`, `[IMPROVED]:`
 * - Inline tagged items: `[IMPROVED] Title: Desc`, `- [FIX] Single sentence`
 * - Standard bullets/numbered items with or without `Title: Description`
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

  // Matches standalone section headers with or without brackets/markdown headings:
  // e.g. "New Feature:", "### Bug Fixes", "[New]:", "**Improvements**:"
  const sectionHeaderRegex = /^(?:#{1,6}\s*)?\*{0,2}\[?([A-Za-z' ]+?)\]?\*{0,2}\s*:?\s*$/

  // Matches single-line tagged items with optional bullet/number:
  // e.g. "[IMPROVED] Title: Desc", "- [NEW] **Title**: Desc", "1. [FIX] Single line"
  const inlineTaggedRegex = /^(?:[-*+]|\d+[.)])?\s*\[([A-Za-z' ]+)\]\s*:?\s*(.+)$/

  // Matches list items under a section header:
  // e.g. "- Added recurring tasks." or "1. **Title**: Description"
  const listItemRegex = /^(?:[-*+]|\d+[.)])\s+(.+)$/

  const splitTitleAndDesc = (
    rawText: string,
  ): { title?: string; description: string } => {
    const cleaned = rawText.replace(/\*{1,2}/g, '').trim()
    const separatorMatch = cleaned.match(/^([^:–—-]+?)\s*[:–—-]\s+(.+)$/)
    if (separatorMatch) {
      return {
        title: separatorMatch[1].trim(),
        description: separatorMatch[2].trim(),
      }
    }
    return {
      description: cleaned,
    }
  }

  for (const line of lines) {
    // 1. Standalone section header like "New Feature:" or "[New]:"
    const sectionMatch = line.match(sectionHeaderRegex)
    if (sectionMatch) {
      const detected = normalizeBadge(sectionMatch[1])
      if (detected) {
        activeSectionBadge = detected
        continue
      }
    }

    // 2. Inline tagged item like "[IMPROVED] Better sync"
    const inlineMatch = line.match(inlineTaggedRegex)
    if (inlineMatch) {
      const badge = normalizeBadge(inlineMatch[1]) ?? 'Improved'
      const { title, description } = splitTitleAndDesc(inlineMatch[2])
      highlights.push({ badge, title, description })
      continue
    }

    // 3. Numbered or bulleted item (inherits active section badge if set)
    const listMatch = line.match(listItemRegex)
    if (listMatch) {
      const badge = activeSectionBadge ?? 'Improved'
      const { title, description } = splitTitleAndDesc(listMatch[1])
      highlights.push({ badge, title, description })
      continue
    }

    // 4. Ignore other Markdown headings (e.g. "## Changelog")
    if (line.startsWith('#')) continue

    // 5. First plain descriptive paragraph becomes the modal headline
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
      // Network error or offline — fall through to fallback
    }
  }

  return getReleaseForVersion(version)
}