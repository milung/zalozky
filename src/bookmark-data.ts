export const DEFAULT_DATA = [
  {
    title: 'MDN Web Docs',
    url: 'https://developer.mozilla.org/',
    icon: '🌐',
    background: '#ecfeff',
    borderColor: '#06b6d4',
    description: 'Reference for HTML, CSS and JavaScript.',
    tags: ['docs', 'web', 'reference']
  },
  {
    title: 'Vite',
    url: 'https://vite.dev/',
    icon: '⚡',
    background: '#fef3c7',
    borderColor: '#f59e0b',
    description: 'Fast frontend tooling and build setup.',
    tags: ['tooling', 'dev', 'build']
  },
  {
    title: 'Lit',
    url: 'https://lit.dev/',
    icon: '🧩',
    background: '#ede9fe',
    borderColor: '#8b5cf6',
    description: 'Simple and fast web components library.',
    tags: ['web', 'components', 'dev']
  },
  {
    title: 'GitHub',
    url: 'https://github.com/',
    icon: '🐙',
    background: '#f3f4f6',
    borderColor: '#111827',
    description: 'Source code hosting and collaboration platform.',
    tags: ['code', 'social', 'dev']
  }
]

export function normalizeTags(tags = []) {
  return Array.from(
    new Set(
      (Array.isArray(tags) ? tags : [])
        .filter(Boolean)
        .map((tag) => String(tag).trim().toLowerCase())
        .filter(Boolean)
    )
  )
}

export function getAllTags(bookmarks = []) {
  return normalizeTags(bookmarks.flatMap((bookmark) => bookmark.tags ?? []))
}

export const MAX_USAGE_HISTORY = 50
export const USAGE_DEBOUNCE_MS = 30_000
export const HALF_LIFE_DAYS = 30
export const HOUR_KERNEL_SIGMA = 2.0
export const COLD_START_DAYS = 7
export const COLD_START_MAX_BONUS = 0.5

export function normalizeUsageHistory(history = []) {
  const rawHistory = Array.isArray(history) ? history : []
  const validHistory = rawHistory.filter((ts) => Number.isFinite(ts) && ts > 0)
  const uniqueHistory = Array.from(new Set(validHistory.map((ts) => Number(ts))))
  return uniqueHistory.sort((a, b) => a - b).slice(-MAX_USAGE_HISTORY)
}

export function recordBookmarkUsage(history = [], timestamp = Date.now()) {
  const normalized = normalizeUsageHistory(history)
  if (!normalized.length) {
    return normalizeUsageHistory([timestamp])
  }

  const lastTimestamp = normalized[normalized.length - 1]
  if (timestamp - lastTimestamp < USAGE_DEBOUNCE_MS) {
    return normalized
  }

  return normalizeUsageHistory([...normalized, timestamp])
}

type BookmarkLike = Record<string, any>

export function getBookmarkKey(bookmark: BookmarkLike = {}) {
  const url = String(bookmark.url ?? '').trim()
  if (url) return url

  const explicitId = String(bookmark.id ?? '').trim()
  if (explicitId) return explicitId

  const title = String(bookmark.title ?? '').trim()
  return title || 'bookmark'
}

export function calculateBookmarkScore(bookmark: BookmarkLike = {}, referenceDate = new Date()) {
  const nowMs = referenceDate.getTime()
  const dNow = referenceDate.getDay()
  const hNow = referenceDate.getHours() + (referenceDate.getMinutes() / 60)
  const usageHistory = normalizeUsageHistory(bookmark?.usageHistory ?? [])

  let score = 0
  for (const ts of usageHistory) {
    const ageMs = nowMs - ts
    if (ts > nowMs && ts - nowMs > 86_400_000) continue

    const ageDays = Math.max(0, ageMs / 86_400_000)
    const weightAge = Math.exp(-(Math.LN2 / HALF_LIFE_DAYS) * ageDays)

    const clickDate = new Date(ts)
    const hClick = clickDate.getHours() + (clickDate.getMinutes() / 60)
    const diffH = Math.abs(hNow - hClick)
    const circularDiffH = Math.min(diffH, 24 - diffH)
    const kernelHour = Math.exp(-(circularDiffH ** 2) / (2 * (HOUR_KERNEL_SIGMA ** 2)))

    const dClick = clickDate.getDay()
    let weightDay = 0
    if (dNow === dClick) {
      weightDay = 1
    } else if ((dNow >= 1 && dNow <= 5 && dClick >= 1 && dClick <= 5) || (dNow === 0 || dNow === 6) && (dClick === 0 || dClick === 6)) {
      weightDay = 0.6
    } else {
      weightDay = 0.15
    }

    score += weightAge * kernelHour * weightDay
  }

  const createdAtMs = Number.isFinite(bookmark?.createdAtMs) ? Number(bookmark.createdAtMs) : 0
  if (createdAtMs > 0) {
    const createdAgeDays = (nowMs - createdAtMs) / 86_400_000
    if (createdAgeDays >= 0 && createdAgeDays < COLD_START_DAYS) {
      score += COLD_START_MAX_BONUS * (1 - createdAgeDays / COLD_START_DAYS)
    }
  }

  return score
}

export function sortBookmarksByProbability(bookmarks = [], referenceDate = new Date()) {
  const ranked = (Array.isArray(bookmarks) ? bookmarks : []).map((bookmark) => ({
    bookmark,
    score: calculateBookmarkScore(bookmark, referenceDate),
    typePriority: bookmark?.type === 'widget' ? 1 : 0
  }))

  ranked.sort((left, right) => {
    const typeDiff = right.typePriority - left.typePriority
    if (typeDiff !== 0) {
      return typeDiff
    }

    const scoreDiff = right.score - left.score
    if (Math.abs(scoreDiff) >= 1e-6) {
      return scoreDiff
    }

    const leftCreated = Number.isFinite(left.bookmark?.createdAtMs) ? Number(left.bookmark.createdAtMs) : 0
    const rightCreated = Number.isFinite(right.bookmark?.createdAtMs) ? Number(right.bookmark.createdAtMs) : 0
    if (leftCreated !== rightCreated) {
      return rightCreated - leftCreated
    }

    const leftTitle = String(left.bookmark?.title ?? '')
    const rightTitle = String(right.bookmark?.title ?? '')
    return leftTitle.localeCompare(rightTitle)
  })

  return ranked.map(({ bookmark }) => bookmark)
}

export function reconcileBookmarks(localBookmarks = [], firebaseBookmarks = []) {
  const localEntries = Array.isArray(localBookmarks) ? localBookmarks : []
  const firebaseEntries = Array.isArray(firebaseBookmarks) ? firebaseBookmarks : []
  const firebaseByKey = new Map(firebaseEntries.map((bookmark) => [getBookmarkKey(bookmark), bookmark]))

  const merged = firebaseEntries.map((bookmark) => {
    const key = getBookmarkKey(bookmark)
    const localMatch = localEntries.find((localBookmark) => getBookmarkKey(localBookmark) === key)
    const localUsage = normalizeUsageHistory(localMatch?.usageHistory ?? [])
    const firebaseUsage = normalizeUsageHistory(bookmark?.usageHistory ?? [])
    const mergedUsage = normalizeUsageHistory([...localUsage, ...firebaseUsage])
    const createdAtMs = Number.isFinite(bookmark?.createdAtMs)
      ? Number(bookmark.createdAtMs)
      : Number.isFinite(localMatch?.createdAtMs)
        ? Number(localMatch.createdAtMs)
        : 0

    return {
      ...(localMatch ?? {}),
      ...bookmark,
      usageHistory: mergedUsage,
      createdAtMs,
      ...((localMatch ?? {}) && { source: 'firebase' }),
      source: 'firebase',
      deleted: Boolean(bookmark.deleted || localMatch?.deleted),
      needsFirebaseSync: mergedUsage.length > firebaseUsage.length
    }
  })

  localEntries.forEach((bookmark) => {
    const key = getBookmarkKey(bookmark)
    if (firebaseByKey.has(key)) return

    merged.push({
      ...bookmark,
      source: 'local',
      deleted: true
    })
  })

  return merged
}

export async function loadBookmarks() {
  try {
    const response = await fetch('./zalozky.json')
    if (!response.ok) {
      return DEFAULT_DATA.map((bookmark) => ({ ...bookmark, source: 'local' }))
    }

    const data = await response.json()
    const items = Array.isArray(data) ? data : data.bookmarks ?? []
    const normalized = (items.length ? items : DEFAULT_DATA).map((bookmark) => ({
      ...bookmark,
      isSearch: Boolean(bookmark.isSearch),
      source: 'local'
    }))
    return normalized
  } catch (error) {
    return DEFAULT_DATA.map((bookmark) => ({ ...bookmark, source: 'local' }))
  }
}

export function parseQuery(query = '') {
  const raw = String(query ?? '').trim()
  if (!raw) return []

  const tokenList = raw.match(/:\w[\w-]*|&&|\|\||!|\(|\)|[^\s()]+/g) ?? []
  const tokens = []

  for (let index = 0; index < tokenList.length; index += 1) {
    const token = tokenList[index]

    if (token === '&&') {
      tokens.push({ type: 'and', value: token })
      continue
    }

    if (token === '||') {
      tokens.push({ type: 'or', value: token })
      continue
    }

    if (token === '!') {
      tokens.push({ type: 'not', value: token })
      continue
    }

    if (token === '(' || token === ')') {
      tokens.push({ type: 'group', value: token })
      continue
    }

    if (token.startsWith(':')) {
      tokens.push({ type: 'tag', value: token.slice(1).toLowerCase() })
      continue
    }

    tokens.push({ type: 'word', value: token.toLowerCase() })
  }

  const finalTokens = []
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    const previous = finalTokens[finalTokens.length - 1]

    if (
      (token.type === 'tag' || token.type === 'word') &&
      previous &&
      previous.type !== 'and' &&
      previous.type !== 'or' &&
      previous.type !== 'not' &&
      previous.type !== 'group' &&
      previous.value !== '(' &&
      previous.value !== ')'
    ) {
      finalTokens.push({ type: 'and', value: '&&' })
    }

    finalTokens.push(token)
  }

  return finalTokens
}

function parseOr(tokens: Array<Record<string, any>>, index: number, bookmark: BookmarkLike) {
  let { value, index: nextIndex } = parseAnd(tokens, index, bookmark)

  while (tokens[nextIndex] && tokens[nextIndex].type === 'or') {
    const right = parseAnd(tokens, nextIndex + 1, bookmark)
    value = value || right.value
    nextIndex = right.index
  }

  return { value, index: nextIndex }
}

function parseAnd(tokens: Array<Record<string, any>>, index: number, bookmark: BookmarkLike) {
  let { value, index: nextIndex } = parseNot(tokens, index, bookmark)

  while (tokens[nextIndex] && tokens[nextIndex].type === 'and') {
    const right = parseNot(tokens, nextIndex + 1, bookmark)
    value = value && right.value
    nextIndex = right.index
  }

  return { value, index: nextIndex }
}

function parseNot(tokens: Array<Record<string, any>>, index: number, bookmark: BookmarkLike) {
  if (tokens[index] && tokens[index].type === 'not') {
    const next = parseNot(tokens, index + 1, bookmark)
    return { value: !next.value, index: next.index }
  }

  if (tokens[index] && tokens[index].type === 'group' && tokens[index].value === '(') {
    const expr = parseOr(tokens, index + 1, bookmark)
    if (!tokens[expr.index] || tokens[expr.index].type !== 'group' || tokens[expr.index].value !== ')') {
      return { value: false, index: expr.index }
    }
    return { value: expr.value, index: expr.index + 1 }
  }

  const token = tokens[index]
  if (!token) return { value: false, index }

  if (token.type === 'tag') {
    return { value: bookmark.tags.includes(token.value), index: index + 1 }
  }

  if (token.type === 'word') {
    const haystack = `${bookmark.title} ${bookmark.description ?? ''} ${bookmark.url ?? ''} ${bookmark.html ?? ''} ${bookmark.tags.join(' ')}`.toLowerCase()
    return { value: haystack.includes(token.value), index: index + 1 }
  }

  return { value: false, index: index + 1 }
}

export function matchesBookmark(bookmark: BookmarkLike = {}, query = '') {
  const parsed = parseQuery(query)
  if (!parsed.length) return true

  const normalizedBookmark = {
    tags: normalizeTags(bookmark.tags ?? []),
    title: String(bookmark.title ?? '').toLowerCase(),
    description: String(bookmark.description ?? '').toLowerCase(),
    url: String(bookmark.url ?? '').toLowerCase(),
    html: String(bookmark.html ?? '').toLowerCase(),
    isSearch: Boolean(bookmark.isSearch)
  }

  const result = parseOr(parsed, 0, normalizedBookmark)
  return Boolean(result.value)
}

export function filterBookmarks(bookmarks: BookmarkLike[] = [], query = '', selectedTags: string[] = []) {
  const normalizedSelected = normalizeTags(selectedTags)
  const trimmed = String(query ?? '').trim()

  return bookmarks.filter((bookmark: BookmarkLike) => {
    if (trimmed && !matchesBookmark(bookmark, trimmed)) {
      return false
    }

    if (!normalizedSelected.length) {
      return true
    }

    const bookmarkTags = normalizeTags(bookmark.tags ?? [])
    return normalizedSelected.every((tag) => bookmarkTags.includes(tag))
  })
}
