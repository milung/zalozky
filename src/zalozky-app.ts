import { LitElement, css, html } from 'lit'
import './zalozky-link'
import './zalozky-link-editor'
import './zalozky-widget'
import './zalozky-widget-editor'
import './zalozky-tags'
import {
  filterBookmarks,
  getAllTags,
  loadBookmarks,
  normalizeTags,
  normalizeUsageHistory,
  recordBookmarkUsage,
  reconcileBookmarks,
  sortBookmarksByProbability
} from './bookmark-data'
import { auth, deleteBookmarkForUser, fetchBookmarksForUser, isFirebaseConfigured, onAuthChange, saveBookmarkForUser, signInWithGoogle, signOutUser, updateBookmarkForUser } from './firebase'
import { formatCount, getCurrentLocale, setLocale, t } from './i18n'

export class ZalozkyApp extends LitElement {
  declare bookmarks: any[]
  declare query: string
  declare selectedTags: string[]
  declare tagFilter: string
  declare expandedBookmarkUrl: string
  declare user: any
  declare authMessage: string
  declare firebaseReady: boolean
  declare showBookmarkDialog: boolean
  declare bookmarkForm: Record<string, any>
  declare bookmarkFormMode: string
  declare bookmarkFormTagInput: string
  declare bookmarkFormError: string
  declare showWidgetDialog: boolean
  declare widgetForm: Record<string, any>
  declare widgetFormMode: string
  declare widgetFormTagInput: string
  declare widgetFormError: string
  declare theme: string
  declare locale: string
  declare userMenuOpen: boolean
  declare addMenuOpen: boolean
  sortingReferenceTime: Date

  static get properties() {
    return {
      bookmarks: { type: Array },
      query: { type: String },
      selectedTags: { type: Array },
      tagFilter: { type: String },
      expandedBookmarkUrl: { type: String },
      user: { type: Object },
      authMessage: { type: String },
      firebaseReady: { type: Boolean },
      showBookmarkDialog: { type: Boolean },
      bookmarkForm: { type: Object },
      bookmarkFormMode: { type: String },
      bookmarkFormTagInput: { type: String },
      bookmarkFormError: { type: String },
      showWidgetDialog: { type: Boolean },
      widgetForm: { type: Object },
      widgetFormMode: { type: String },
      widgetFormTagInput: { type: String },
      widgetFormError: { type: String },
      theme: { type: String },
      locale: { type: String },
      userMenuOpen: { type: Boolean },
      addMenuOpen: { type: Boolean }
    }
  }

  constructor() {
    super()
    this.bookmarks = []
    this.query = ''
    this.selectedTags = []
    this.tagFilter = ''
    this.expandedBookmarkUrl = ''
    this.user = null
    this.authMessage = ''
    this.firebaseReady = isFirebaseConfigured
    this.showBookmarkDialog = false
    this.showWidgetDialog = false
    this.theme = this.getStoredThemePreference() || 'system'
    this.locale = getCurrentLocale()
    this.userMenuOpen = false
    this.addMenuOpen = false
    this.sortingReferenceTime = new Date()
    this.bookmarkForm = this.emptyBookmarkForm()
    this.bookmarkFormMode = 'create'
    this.bookmarkFormTagInput = ''
    this.bookmarkFormError = ''
    this.widgetForm = this.emptyWidgetForm()
    this.widgetFormMode = 'create'
    this.widgetFormTagInput = ''
    this.widgetFormError = ''
  }

  emptyBookmarkForm() {
    return {
      id: '',
      type: 'bookmark',
      title: '',
      url: '',
      description: '',
      icon: '',
      background: '#ecfeff',
      borderColor: '#06b6d4',
      foregroundColor: '#111827',
      tags: [],
      isSearch: false,
      usageHistory: [],
      createdAtMs: 0,
      source: 'local'
    }
  }

  emptyWidgetForm() {
    return {
      id: '',
      type: 'widget',
      title: '',
      url: '',
      html: '',
      tags: [],
      background: '#ecfeff',
      borderColor: '#06b6d4',
      foregroundColor: '#111827',
      usageHistory: [],
      createdAtMs: 0,
      source: 'local'
    }
  }

  connectedCallback() {
    super.connectedCallback()
    this.syncTheme()
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    this.loadCurrentBookmarks()

    if (auth) {
      onAuthChange(async (user) => {
        this.user = user
        await this.loadCurrentBookmarks()
      })
    }
  }

  disconnectedCallback() {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    super.disconnectedCallback()
  }

  handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && Date.now() - this.sortingReferenceTime.getTime() > 5 * 60_000) {
      this.sortingReferenceTime = new Date()
      this.requestUpdate()
    }
  }

  getLocalStorageKey() {
    return 'zalozky-local-bookmarks-v1'
  }

  getThemeStorageKey() {
    return 'zalozky-theme-preference'
  }

  getStoredThemePreference() {
    try {
      const stored = window.localStorage.getItem(this.getThemeStorageKey())
      return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
    } catch (error) {
      return 'system'
    }
  }

  getResolvedTheme() {
    if (this.theme === 'light' || this.theme === 'dark') return this.theme

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }

    return 'light'
  }

  syncTheme() {
    const resolvedTheme = this.getResolvedTheme()
    const isDark = resolvedTheme === 'dark'
    const palette = isDark
      ? {
          bg: '#0f172a',
          panel: '#111827',
          panelStrong: '#1f2937',
          ink: '#e5e7eb',
          muted: '#9ca3af',
          accent: '#60a5fa',
          accentText: '#f8fafc',
          border: '#334155',
          shadow: 'rgba(15, 23, 42, 0.42)',
          chipBg: '#1e293b',
          chipText: '#e2e8f0',
          fieldBg: '#0b1220',
          fieldText: '#e2e8f0',
          buttonText: '#f8fafc',
          buttonBg: '#1d4ed8',
          backdrop: 'rgba(15, 23, 42, 0.7)',
          sourceBadge: 'rgba(148, 163, 184, 0.12)',
          sourceText: '#dbeafe',
          deleteBg: 'rgba(127, 29, 29, 0.35)',
          deleteText: '#fecaca',
          dialogBg: '#111827',
          dialogSurface: '#0f172a',
          dialogText: '#e5e7eb',
          dialogMuted: '#cbd5e1',
          dialogBorder: '#334155',
          danger: '#fca5a5',
          dangerBg: '#7f1d1d'
        }
      : {
          bg: '#f5f7fb',
          panel: 'rgba(255, 255, 255, 0.9)',
          panelStrong: '#ffffff',
          ink: '#1f2937',
          muted: '#64748b',
          accent: '#2563eb',
          accentText: '#ffffff',
          border: '#dfe7f1',
          shadow: 'rgba(15, 23, 42, 0.08)',
          chipBg: '#eef2ff',
          chipText: '#1f2937',
          fieldBg: 'rgba(255,255,255,0.75)',
          fieldText: '#1f2937',
          buttonText: '#ffffff',
          buttonBg: '#2563eb',
          backdrop: 'rgba(15, 23, 42, 0.42)',
          sourceBadge: 'rgba(255,255,255,0.72)',
          sourceText: '#1f2937',
          deleteBg: 'rgba(254, 226, 226, 0.9)',
          deleteText: '#b91c1c',
          dialogBg: '#ffffff',
          dialogSurface: '#ffffff',
          dialogText: '#1f2937',
          dialogMuted: '#475569',
          dialogBorder: '#dfe7f1',
          danger: '#b91c1c',
          dangerBg: '#fee2e2'
        }

    this.style.setProperty('--bg', palette.bg)
    this.style.setProperty('--panel', palette.panel)
    this.style.setProperty('--panel-strong', palette.panelStrong)
    this.style.setProperty('--ink', palette.ink)
    this.style.setProperty('--muted', palette.muted)
    this.style.setProperty('--accent', palette.accent)
    this.style.setProperty('--accent-text', palette.accentText)
    this.style.setProperty('--border', palette.border)
    this.style.setProperty('--shadow', palette.shadow)
    this.style.setProperty('--chip-bg', palette.chipBg)
    this.style.setProperty('--chip-text', palette.chipText)
    this.style.setProperty('--field-bg', palette.fieldBg)
    this.style.setProperty('--field-text', palette.fieldText)
    this.style.setProperty('--button-text', palette.buttonText)
    this.style.setProperty('--button-bg', palette.buttonBg)
    this.style.setProperty('--backdrop', palette.backdrop)
    this.style.setProperty('--source-badge', palette.sourceBadge)
    this.style.setProperty('--source-text', palette.sourceText)
    this.style.setProperty('--delete-bg', palette.deleteBg)
    this.style.setProperty('--delete-text', palette.deleteText)
    this.style.setProperty('--dialog-bg', palette.dialogBg)
    this.style.setProperty('--dialog-surface', palette.dialogSurface)
    this.style.setProperty('--dialog-text', palette.dialogText)
    this.style.setProperty('--dialog-muted', palette.dialogMuted)
    this.style.setProperty('--dialog-border', palette.dialogBorder)
    this.style.setProperty('--danger', palette.danger)
    this.style.setProperty('--danger-bg', palette.dangerBg)
    this.style.setProperty('color-scheme', resolvedTheme)
    this.style.setProperty('--theme-name', resolvedTheme)
  }

  setThemePreference(nextTheme) {
    const safeTheme = nextTheme === 'light' || nextTheme === 'dark' || nextTheme === 'system' ? nextTheme : 'system'

    try {
      window.localStorage.setItem(this.getThemeStorageKey(), safeTheme)
    } catch (error) {
      // local storage may be unavailable in some contexts
    }

    this.theme = safeTheme
    this.syncTheme()
  }

  cycleTheme() {
    const order = ['system', 'light', 'dark']
    const currentIndex = order.indexOf(this.theme)
    const nextTheme = order[(currentIndex + 1) % order.length]
    this.setThemePreference(nextTheme)
  }

  get themeButtonLabel() {
    const resolved = this.getResolvedTheme()
    if (this.theme === 'system') return `${t('app.themeSystem')} (${resolved})`
    return this.theme === 'light' ? t('app.themeLight') : t('app.themeDark')
  }

  switchLocale() {
    const nextLocale = this.locale === 'sk' ? 'en' : 'sk'
    this.locale = setLocale(nextLocale)
    this.requestUpdate()
  }

  readStoredLocalBookmarks() {
    const fallbackStore = this.getFallbackLocalBookmarksStore()

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(this.getLocalStorageKey())
        if (!raw) return fallbackStore
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : fallbackStore
      }
      return fallbackStore
    } catch (error) {
      return fallbackStore
    }
  }

  writeStoredLocalBookmarks(bookmarks) {
    const fallbackStore = this.getFallbackLocalBookmarksStore()
    const nextBookmarks = Array.isArray(bookmarks) ? bookmarks : []

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.getLocalStorageKey(), JSON.stringify(nextBookmarks))
        return
      }
      this.setFallbackLocalBookmarksStore(nextBookmarks)
    } catch (error) {
      this.setFallbackLocalBookmarksStore(nextBookmarks)
    }
  }

  getFallbackLocalBookmarksStore() {
    const sharedStore = globalThis.__zalozkyLocalBookmarksStore ??= {}
    const current = sharedStore[this.getLocalStorageKey()] ?? []
    return Array.isArray(current) ? current : []
  }

  setFallbackLocalBookmarksStore(bookmarks) {
    const sharedStore = globalThis.__zalozkyLocalBookmarksStore ??= {}
    sharedStore[this.getLocalStorageKey()] = Array.isArray(bookmarks) ? bookmarks : []
    return sharedStore[this.getLocalStorageKey()]
  }

  async ensureLocalStorageSeed() {
    const stored = this.readStoredLocalBookmarks()
    if (stored.length > 0) {
      return stored
    }

    const defaultBookmarks = await loadBookmarks()
    this.writeStoredLocalBookmarks(defaultBookmarks)
    return defaultBookmarks
  }

  mergeStoredLocalBookmarks(baseBookmarks = []) {
    const stored = this.readStoredLocalBookmarks()
    const overrides = new Map(stored.map((item) => [String(item.url ?? item.id ?? '').trim(), item]))

    const merged = baseBookmarks.map((bookmark) => {
      const key = String(bookmark.url ?? '').trim()
      if (!overrides.has(key)) return { ...bookmark, source: 'local' }
      return { ...bookmark, ...overrides.get(key), source: 'local' }
    })

    const extras = stored.filter((item) => !baseBookmarks.some((bookmark) => String(bookmark.url ?? '') === String(item.url ?? '')))
    return [...merged, ...extras.map((item) => ({ ...item, source: 'local' }))]
  }

  async loadCurrentBookmarks() {
    const localBookmarks = await this.ensureLocalStorageSeed()

    if (this.user && auth && this.firebaseReady) {
      try {
        const firebaseBookmarks = await fetchBookmarksForUser(this.user.uid)
        const reconciledBookmarks = reconcileBookmarks(localBookmarks, firebaseBookmarks)

        this.bookmarks = reconciledBookmarks
        this.writeStoredLocalBookmarks(reconciledBookmarks.filter((bookmark) => !bookmark.deleted))

        reconciledBookmarks
          .filter((bookmark) => bookmark.needsFirebaseSync && bookmark.id)
          .forEach((bookmark) => {
            void updateBookmarkForUser(this.user.uid, bookmark.id, bookmark).catch(() => {})
          })

        this.authMessage = ''
        return
      } catch (error) {
        this.bookmarks = this.mergeStoredLocalBookmarks(localBookmarks)
        this.authMessage = error.message || 'Unable to load Firebase bookmarks.'
        return
      }
    }

    try {
      this.bookmarks = this.mergeStoredLocalBookmarks(localBookmarks)
    } catch (error) {
      this.bookmarks = this.mergeStoredLocalBookmarks(await loadBookmarks())
      this.authMessage = error.message || 'Unable to load bookmarks.'
    }
  }

  get allTags() {
    return getAllTags(this.bookmarks)
  }

  get visibleBookmarks() {
    return sortBookmarksByProbability(
      filterBookmarks(this.bookmarks, this.query, this.selectedTags).filter((bookmark) => {
        const tagText = (bookmark.tags ?? []).join(' ').toLowerCase()
        const haystack = `${bookmark.title} ${bookmark.description ?? ''} ${bookmark.url} ${tagText}`.toLowerCase()
        const filter = this.tagFilter.trim().toLowerCase()
        return !filter || haystack.includes(filter)
      }),
      this.sortingReferenceTime
    )
  }

  handleInput(event) {
    this.query = event.target.value
  }

  async handleAuthClick() {
    if (!this.firebaseReady) {
      this.authMessage = String(t('app.authRequired'))
      return
    }

    try {
      if (this.user) {
        return
      }

      const signedInUser = await signInWithGoogle()
      this.user = signedInUser
      this.userMenuOpen = false
      this.authMessage = String(t('app.authSignedIn', { name: signedInUser.displayName || signedInUser.email }))
      await this.loadCurrentBookmarks()
    } catch (error) {
      this.authMessage = String(error.message || t('app.authSignInFailed'))
    }
  }

  toggleUserMenu() {
    if (!this.user) return
    this.userMenuOpen = !this.userMenuOpen
  }

  toggleAddMenu() {
    this.addMenuOpen = !this.addMenuOpen
  }

  closeAddMenu() {
    this.addMenuOpen = false
  }

  closeUserMenu() {
    this.userMenuOpen = false
  }

  async signOutCurrentUser() {
    if (!this.user) return

    try {
      await signOutUser()
      this.user = null
      this.userMenuOpen = false
      this.authMessage = String(t('app.authSignedOut'))
      await this.loadCurrentBookmarks()
    } catch (error) {
      this.authMessage = String(error.message || t('app.authSignOutFailed'))
    }
  }

  toggleTag(tag, cumulative = false) {
    const selected = this.selectedTags || []

    if (cumulative) {
      this.selectedTags = selected.includes(tag)
        ? selected.filter((item) => item !== tag)
        : [...selected, tag]
      return
    }

    this.selectedTags = selected.includes(tag) ? [] : [tag]
  }

  handleTagFilterChange(event) {
    this.tagFilter = event.detail?.value ?? ''
  }

  handleTagToggle(event) {
    const { tag, cumulative } = event.detail ?? {}
    if (tag) {
      this.toggleTag(tag, cumulative)
    }
  }

  toggleExpanded(bookmark) {
    const nextUrl = this.expandedBookmarkUrl === bookmark.url ? '' : bookmark.url
    this.expandedBookmarkUrl = nextUrl
  }

  async deleteBookmark(bookmark) {
    if (!bookmark) return

    const targetId = bookmark.id || ''
    const targetUrl = this.normalizeBookmarkUrl(bookmark.url ?? '')
    const matchPredicate = (item) => {
      const itemId = String(item.id ?? item.url ?? '').trim()
      const itemUrl = this.normalizeBookmarkUrl(item.url ?? '')
      return !(itemId === targetId || (targetUrl && itemUrl === targetUrl) || (!targetId && !targetUrl && item.title === bookmark.title))
    }

    const localBookmarks = this.readStoredLocalBookmarks()
    this.writeStoredLocalBookmarks(localBookmarks.filter(matchPredicate))

    const firebaseMatchId = targetId || this.getFirebaseBookmarkIdForUrl(targetUrl || bookmark.url || '')
    if (this.user && this.firebaseReady && firebaseMatchId) {
      try {
        await deleteBookmarkForUser(this.user.uid, firebaseMatchId)
      } catch (error) {
        this.authMessage = error.message || 'Unable to delete bookmark from Firebase.'
      }
    }

    this.bookmarks = this.bookmarks.filter(matchPredicate)
    this.requestUpdate()
  }

  openAddBookmarkDialog() {
    this.bookmarkFormMode = 'create'
    this.bookmarkForm = this.emptyBookmarkForm()
    this.bookmarkFormTagInput = ''
    this.bookmarkFormError = ''
    this.showBookmarkDialog = true
    this.showWidgetDialog = false
    this.closeAddMenu()
  }

  openAddWidgetDialog() {
    this.widgetFormMode = 'create'
    this.widgetForm = this.emptyWidgetForm()
    this.widgetFormTagInput = ''
    this.widgetFormError = ''
    this.showWidgetDialog = true
    this.showBookmarkDialog = false
    this.closeAddMenu()
  }

  getDialogPreviewStyle() {
    const background = this.bookmarkForm?.background || '#ecfeff'
    const borderColor = this.bookmarkForm?.borderColor || '#06b6d4'
    const foregroundColor = this.bookmarkForm?.foregroundColor || '#111827'
    return `background:${background}; border:2px solid ${borderColor}; color:${foregroundColor};`
  }

  makeSafeBookmarkId(url, fallback = 'bookmark') {
    const source = String(url || fallback || 'bookmark').trim()
    const base = source.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || fallback
    return `${base}-${String(Date.now()).slice(-6)}`
  }

  openEditBookmarkDialog(bookmark) {
    this.bookmarkFormMode = 'edit'
    this.bookmarkForm = {
      id: bookmark.id || this.makeSafeBookmarkId(bookmark.url || bookmark.title || 'bookmark'),
      title: bookmark.title ?? '',
      url: bookmark.url ?? '',
      description: bookmark.description ?? '',
      icon: bookmark.icon ?? '',
      background: bookmark.background ?? '#ecfeff',
      borderColor: bookmark.borderColor ?? '#06b6d4',
      foregroundColor: bookmark.foregroundColor ?? '#111827',
      tags: Array.isArray(bookmark.tags) ? [...bookmark.tags] : [],
      isSearch: Boolean(bookmark.isSearch),
      usageHistory: normalizeUsageHistory(bookmark.usageHistory),
      createdAtMs: bookmark.createdAtMs || 0,
      source: bookmark.source ?? 'local'
    }
    this.bookmarkFormTagInput = ''
    this.bookmarkFormError = ''
    this.showBookmarkDialog = true
  }

  closeBookmarkDialog() {
    this.showBookmarkDialog = false
    this.bookmarkForm = this.emptyBookmarkForm()
    this.bookmarkFormTagInput = ''
    this.bookmarkFormError = ''
  }

  closeWidgetDialog() {
    this.showWidgetDialog = false
    this.widgetForm = this.emptyWidgetForm()
    this.widgetFormTagInput = ''
    this.widgetFormError = ''
  }

  getBookmarkPalette(seed = 'bookmark') {
    const palette = [
      { background: '#ecfeff', borderColor: '#06b6d4' },
      { background: '#fef3c7', borderColor: '#f59e0b' },
      { background: '#ede9fe', borderColor: '#8b5cf6' },
      { background: '#f3f4f6', borderColor: '#111827' },
      { background: '#dcfce7', borderColor: '#22c55e' },
      { background: '#fee2e2', borderColor: '#ef4444' }
    ]

    const index = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length
    return palette[index]
  }

  normalizeBookmarkUrl(value = '') {
    const trimmed = String(value ?? '').trim()
    if (!trimmed) return ''
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    if (/^\//.test(trimmed)) return `https:${trimmed}`
    return `https://${trimmed}`
  }

  toggleFormTag(tag) {
    const current = this.bookmarkForm.tags ?? []
    this.bookmarkForm = {
      ...this.bookmarkForm,
      tags: current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag]
    }
  }

  addFormTag() {
    const tag = String(this.bookmarkFormTagInput ?? '').trim().toLowerCase()
    if (!tag) return
    const existing = this.bookmarkForm.tags ?? []
    if (!existing.includes(tag)) {
      this.bookmarkForm = {
        ...this.bookmarkForm,
        tags: [...existing, tag]
      }
    }
    this.bookmarkFormTagInput = ''
  }

  get currentFormSelectedTags() {
    return this.bookmarkForm?.tags ?? []
  }

  async fetchBookmarkMetadata(rawUrl) {
    const url = this.normalizeBookmarkUrl(rawUrl)
    if (!url) return {}

    try {
      const parsed = new URL(url)
      const proxyUrl = `https://r.jina.ai/http://${parsed.host}${parsed.pathname}${parsed.search || ''}`
      const response = await fetch(proxyUrl)
      if (!response.ok) throw new Error('Unable to fetch metadata.')
      const text = await response.text()

      const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/is) || text.match(/(?:^|\n)#+\s*([^\n]+)/)
      const ogTitleMatch = text.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/is)
      const descriptionMatch = text.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/is) || text.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/is)
      const iconMatch = text.match(/<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]+href=["']([^"']+)["']/is)

      const favicon = iconMatch ? iconMatch[1] : `${parsed.origin}/favicon.ico`
      return {
        title: (ogTitleMatch?.[1] || titleMatch?.[1] || parsed.hostname.replace(/^www\./, '')).trim(),
        description: (descriptionMatch?.[1] || '').trim(),
        icon: favicon.trim()
      }
    } catch (error) {
      return {
        icon: `${new URL(url).origin}/favicon.ico`,
        title: '',
        description: ''
      }
    }
  }

  async handleUrlBlur() {
    const url = this.normalizeBookmarkUrl(this.bookmarkForm.url)
    if (!url) return

    const metadata = await this.fetchBookmarkMetadata(url)
    this.bookmarkForm = {
      ...this.bookmarkForm,
      url,
      title: this.bookmarkForm.title || metadata.title || '',
      description: this.bookmarkForm.description || metadata.description || '',
      icon: this.bookmarkForm.icon || metadata.icon || ''
    }
  }

  saveLocalBookmark(bookmark, originalId = '') {
    const stored = this.readStoredLocalBookmarks()
    const targetId = String(originalId || bookmark.id || bookmark.url || '').trim()
    const matchIndex = stored.findIndex((item) => String(item.id ?? item.url ?? '') === targetId)
    const sameUrlIndex = stored.findIndex((item) => String(item.url ?? '') === String(bookmark.url ?? ''))
    const next = [...stored]

    if (this.bookmarkFormMode === 'edit' || originalId) {
      const index = matchIndex >= 0 ? matchIndex : sameUrlIndex
      if (index >= 0) next[index] = { ...bookmark, source: 'local', deleted: false }
      else next.push({ ...bookmark, source: 'local', deleted: false })
    } else {
      next.push({ ...bookmark, source: 'local', deleted: false })
    }

    this.writeStoredLocalBookmarks(next)
  }

  getFirebaseBookmarkIdForUrl(url) {
    if (!url) return ''
    const normalizedUrl = this.normalizeBookmarkUrl(url)
    const firebaseMatch = this.bookmarks.find(
      (bookmark) => bookmark.source === 'firebase' && this.normalizeBookmarkUrl(bookmark.url ?? '') === normalizedUrl
    )
    return firebaseMatch?.id || ''
  }

  async saveBookmarkForm(event) {
    const detail = event?.detail ?? event
    const sourceMode = detail?.mode ?? this.bookmarkFormMode
    const formBookmark = detail?.bookmark ?? this.bookmarkForm
    const editId = sourceMode === 'edit' ? String(formBookmark.id ?? '').trim() : ''

    const url = this.normalizeBookmarkUrl(formBookmark.url)
    if (!url) {
      this.bookmarkFormError = String(t('app.bookmarkUrlRequired'))
      return
    }

    if (formBookmark.isSearch && !url.includes('%s')) {
      this.bookmarkFormError = String(t('app.bookmarkSearchRequiresPlaceholder'))
      return
    }

    const hostUrl = url.replace(/%s/gi, '')
    const palette = this.getBookmarkPalette(formBookmark.title || hostUrl)
    const nextBookmark = {
      type: 'bookmark',
      id: formBookmark.id || this.makeSafeBookmarkId(url, 'bookmark'),
      title: (formBookmark.title || new URL(hostUrl || 'https://example.com').hostname.replace(/^www\./, '')).trim(),
      url,
      description: (formBookmark.description || '').trim(),
      icon: (formBookmark.icon || '').trim() || '🔗',
      background: formBookmark.background || palette.background,
      borderColor: formBookmark.borderColor || palette.borderColor,
      foregroundColor: formBookmark.foregroundColor || '#111827',
      tags: normalizeTags(formBookmark.tags ?? []),
      isSearch: Boolean(formBookmark.isSearch),
      usageHistory: normalizeUsageHistory(formBookmark.usageHistory),
      createdAtMs: formBookmark.createdAtMs || Date.now(),
      source: this.user && this.firebaseReady ? 'firebase' : 'local'
    }

    const dedupeExistingBookmarks = (list) => list.filter((bookmark) => {
      if (sourceMode === 'edit' && editId) {
        return String(bookmark.id ?? '') !== String(editId)
      }
      return this.normalizeBookmarkUrl(bookmark.url ?? '') !== this.normalizeBookmarkUrl(nextBookmark.url)
    })

    try {
      if (this.user && this.firebaseReady) {
        try {
          const firebaseDocId = editId || this.getFirebaseBookmarkIdForUrl(url)
          if (sourceMode === 'edit' && firebaseDocId) {
            nextBookmark.id = firebaseDocId
            await updateBookmarkForUser(this.user.uid, firebaseDocId, nextBookmark)
          } else {
            const saved = await saveBookmarkForUser(this.user.uid, nextBookmark)
            if (saved?.id) nextBookmark.id = saved.id
          }
          this.bookmarks = [nextBookmark, ...dedupeExistingBookmarks(this.bookmarks)]
          this.authMessage = ''
        } catch (firebaseError) {
          console.error('Firebase save failed for bookmark update/create', {
            bookmark: nextBookmark,
            bookmarkFormMode: sourceMode,
            url,
            error: firebaseError
          })
          this.authMessage = `Firebase save failed; saved locally instead. ${firebaseError.message || ''}`.trim()
          this.bookmarkFormError = firebaseError.message || 'Unable to save bookmark in Firebase.'
          this.saveLocalBookmark(nextBookmark, editId)
          this.bookmarks = [nextBookmark, ...dedupeExistingBookmarks(this.bookmarks)]
        }
      } else {
        this.saveLocalBookmark(nextBookmark, editId)
        this.bookmarks = [nextBookmark, ...dedupeExistingBookmarks(this.bookmarks)]
      }

      this.showBookmarkDialog = false
      this.bookmarkForm = this.emptyBookmarkForm()
      this.bookmarkFormTagInput = ''
      this.bookmarkFormError = ''
      this.requestUpdate()
      await this.loadCurrentBookmarks()
      this.bookmarks = [nextBookmark, ...dedupeExistingBookmarks(this.bookmarks)]
    } catch (error) {
      this.bookmarkFormError = error.message || t('app.unableToSaveBookmark')
    }
  }

  async saveWidgetForm(event) {
    const detail = event?.detail ?? event
    const sourceMode = detail?.mode ?? this.widgetFormMode
    const formWidget = detail?.widget ?? this.widgetForm
    const editId = sourceMode === 'edit' ? String(formWidget.id ?? '').trim() : ''

    const title = String(formWidget.title ?? '').trim()
    const html = String(formWidget.html ?? '').trim()
    const normalizedUrl = formWidget.url ? this.normalizeBookmarkUrl(formWidget.url) : ''
    if (!title) {
      this.widgetFormError = String(t('app.widgetTitleRequired'))
      return
    }
    if (!html) {
      this.widgetFormError = String(t('app.widgetHtmlRequired'))
      return
    }

    const nextWidget = {
      type: 'widget',
      id: formWidget.id || this.makeSafeBookmarkId(title, 'widget'),
      title,
      url: normalizedUrl,
      html,
      tags: normalizeTags(formWidget.tags ?? []),
      background: formWidget.background || '#ecfeff',
      borderColor: formWidget.borderColor || '#06b6d4',
      foregroundColor: formWidget.foregroundColor || '#111827',
      usageHistory: normalizeUsageHistory(formWidget.usageHistory),
      createdAtMs: formWidget.createdAtMs || Date.now(),
      source: this.user && this.firebaseReady ? 'firebase' : 'local'
    }

    const dedupeExistingWidgets = (list) => list.filter((bookmark) => {
      if (sourceMode === 'edit' && editId) {
        return !(bookmark.type === 'widget' && String(bookmark.id ?? '') === String(editId))
      }
      return !(bookmark.type === 'widget' && bookmark.id === nextWidget.id)
    })

    try {
      if (this.user && this.firebaseReady) {
        try {
          const firebaseDocId = editId || this.getFirebaseBookmarkIdForUrl(formWidget.id || title)
          if (sourceMode === 'edit' && firebaseDocId) {
            nextWidget.id = firebaseDocId
            await updateBookmarkForUser(this.user.uid, firebaseDocId, nextWidget)
          } else {
            const saved = await saveBookmarkForUser(this.user.uid, nextWidget)
            if (saved?.id) nextWidget.id = saved.id
          }
          this.bookmarks = [nextWidget, ...dedupeExistingWidgets(this.bookmarks)]
          this.authMessage = ''
        } catch (firebaseError) {
          this.authMessage = `Firebase save failed; saved locally instead. ${firebaseError.message || ''}`.trim()
          this.widgetFormError = firebaseError.message || 'Unable to save widget in Firebase.'
          this.saveLocalBookmark(nextWidget, editId)
          this.bookmarks = [nextWidget, ...dedupeExistingWidgets(this.bookmarks)]
        }
      } else {
        this.saveLocalBookmark(nextWidget, editId)
        this.bookmarks = [nextWidget, ...dedupeExistingWidgets(this.bookmarks)]
      }

      this.showWidgetDialog = false
      this.widgetForm = this.emptyWidgetForm()
      this.widgetFormTagInput = ''
      this.widgetFormError = ''
      this.requestUpdate()
      await this.loadCurrentBookmarks()
      this.bookmarks = [nextWidget, ...dedupeExistingWidgets(this.bookmarks)]
    } catch (error) {
      this.widgetFormError = error.message || t('app.unableToSaveWidget')
    }
  }

  handleBookmarkUse(bookmark) {
    const currentHistory = normalizeUsageHistory(bookmark?.usageHistory ?? [])
    const nextHistory = recordBookmarkUsage(currentHistory, Date.now())

    if (
      nextHistory.length === currentHistory.length &&
      nextHistory[nextHistory.length - 1] === currentHistory[currentHistory.length - 1]
    ) {
      return
    }

    const updatedBookmark = {
      ...bookmark,
      usageHistory: nextHistory,
      createdAtMs: bookmark.createdAtMs || Date.now()
    }

    const persistedBookmarks = this.bookmarks.map((currentBookmark) => {
      const sameKey = String(currentBookmark.id ?? currentBookmark.url ?? '') === String(bookmark.id ?? bookmark.url ?? '')
      return sameKey ? updatedBookmark : currentBookmark
    })

    this.writeStoredLocalBookmarks(persistedBookmarks.filter((item) => !item.deleted))

    if (this.user && this.firebaseReady) {
      const firebaseDocId = this.getFirebaseBookmarkIdForUrl(bookmark.url ?? '') || bookmark.id
      if (firebaseDocId) {
        void updateBookmarkForUser(this.user.uid, firebaseDocId, updatedBookmark).catch(() => {})
      }
    }
  }

  render() {
    const visible = this.visibleBookmarks
    const tagRows = this.allTags
      .filter((tag) => !this.tagFilter || tag.includes(this.tagFilter.toLowerCase()))
      .sort()
    const selectedTags = this.currentFormSelectedTags
    const userName = this.user?.displayName || this.user?.email || t('app.googleUser')
    const userInitials = userName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'G'

    return html`
      <main class="app-shell">
        <header class="toolbar">          
            <label class="search-box">
              <input
                type="search"
                .value=${this.query}
                @input=${this.handleInput}
                placeholder=${t('app.searchPlaceholder')}
              />
            </label>
            <div class="add-menu-wrap">
              <div class="add-split-button" role="group" aria-label="Add item menu">
                <button type="button" class="add-primary-button" aria-label=${t('app.addBookmark')} @click=${() => this.openAddBookmarkDialog()}>
                  ${t('app.addBookmark')}
                </button>
                <button type="button" class="add-menu-trigger" aria-label=${t('app.openAddOptions')} @click=${this.toggleAddMenu}>
                  ▾
                </button>
              </div>

              ${this.addMenuOpen ? html`
                <div class="add-dropdown" role="menu" aria-label=${t('app.addItemMenu')}>
                  <button type="button" class="add-option" @click=${this.openAddBookmarkDialog}>${t('app.addBookmark')}</button>
                  <button type="button" class="add-option" @click=${this.openAddWidgetDialog}>${t('app.addWidget')}</button>
                </div>
              ` : ''}
            </div>
            ${this.user
              ? html`
                <div class="user-menu-wrap">
                  <button type="button" class="user-avatar-button" aria-label="Open user menu" @click=${this.toggleUserMenu}>
                    ${this.user.photoURL
                      ? html`<img src=${this.user.photoURL} alt=${userName} />`
                      : html`<span>${userInitials}</span>`}
                  </button>

                  ${this.userMenuOpen ? html`
                    <div class="user-menu" role="menu" aria-label="User menu">
                      <div class="user-menu-header">
                        ${this.user.photoURL
                          ? html`<img src=${this.user.photoURL} alt=${userName} />`
                          : html`<span>${userInitials}</span>`}
                        <div>
                          <strong>${userName}</strong>
                        </div>
                      </div>
                      <button type="button" class="user-menu-item" @click=${() => { this.cycleTheme(); this.closeUserMenu() }}>
                        <span class="material-symbols" aria-hidden="true">${this.theme === 'dark' ? 'dark_mode' : this.theme === 'light' ? 'light_mode' : 'contrast'}</span>
                        <span>${this.themeButtonLabel}</span>
                      </button>
                      <button type="button" class="user-menu-item" @click=${this.switchLocale}>
                        <span class="material-symbols" aria-hidden="true">language</span>
                        <span>${this.locale === 'sk' ? 'English' : 'Slovenčina'}</span>
                      </button>
                      <button type="button" class="user-menu-item" @click=${this.signOutCurrentUser}>
                        <span class="material-symbols" aria-hidden="true">logout</span>
                        <span>${t('app.signOut')}</span>
                      </button>
                    </div>
                  ` : ''}
                </div>
              `
              : html`
                <button type="button" class="auth-button" @click=${this.handleAuthClick}>
                  ${t('app.signInGoogle')}
                </button>
              `}

            
        </header>

        ${this.authMessage ? html`<p class="auth-message">${this.authMessage}</p>` : ''}

        <section class="layout">
          <zalozky-tags
            .tags=${tagRows}
            .selectedTags=${this.selectedTags}
            .filterText=${this.tagFilter}
            .locale=${this.locale}
            @tag-filter-change=${this.handleTagFilterChange}
            @tag-toggle=${this.handleTagToggle}
          ></zalozky-tags>

          <section class="results" aria-live="polite">          
            <div class="bookmark-grid">
              ${visible.map((bookmark) => {
                if (bookmark.type === 'widget') {
                  return html`
                    <zalozky-widget
                      .title=${bookmark.title}
                      .url=${bookmark.url ?? ''}
                      .html=${bookmark.html ?? ''}
                      .tags=${bookmark.tags ?? []}
                      .background=${bookmark.background ?? '#ecfeff'}
                      .borderColor=${bookmark.borderColor ?? '#06b6d4'}
                      .foregroundColor=${bookmark.foregroundColor ?? '#111827'}
                      .source=${bookmark.source ?? 'local'}
                      @edit-request=${() => {
                        this.widgetFormMode = 'edit'
                        this.widgetForm = {
                          id: bookmark.id || this.makeSafeBookmarkId(bookmark.title || 'widget', 'widget'),
                          type: 'widget',
                          title: bookmark.title ?? '',
                          url: bookmark.url ?? '',
                          html: bookmark.html ?? '',
                          tags: Array.isArray(bookmark.tags) ? [...bookmark.tags] : [],
                          background: bookmark.background ?? '#ecfeff',
                          borderColor: bookmark.borderColor ?? '#06b6d4',
                          foregroundColor: bookmark.foregroundColor ?? '#111827',
                          usageHistory: normalizeUsageHistory(bookmark.usageHistory),
                          createdAtMs: bookmark.createdAtMs || 0,
                          source: bookmark.source ?? 'local'
                        }
                        this.widgetFormTagInput = ''
                        this.widgetFormError = ''
                        this.showWidgetDialog = true
                      }}
                      @delete-request=${() => this.deleteBookmark(bookmark)}
                    ></zalozky-widget>
                  `
                }

                const expanded = this.expandedBookmarkUrl === bookmark.url
                return html`
                  <zalozky-link
                    .url=${bookmark.url}
                    .title=${bookmark.title}
                    .description=${bookmark.description ?? ''}
                    .icon=${bookmark.icon ?? '🔗'}
                    .tags=${bookmark.tags ?? []}
                    .background=${bookmark.background ?? '#ecfeff'}
                    .borderColor=${bookmark.borderColor ?? '#06b6d4'}
                    .foregroundColor=${bookmark.foregroundColor ?? '#111827'}
                    .source=${bookmark.source ?? 'local'}
                    .isSearch=${Boolean(bookmark.isSearch)}
                    .expanded=${expanded}
                    @edit-request=${() => this.openEditBookmarkDialog(bookmark)}
                    @delete-request=${() => this.deleteBookmark(bookmark)}
                    @toggle-expand=${() => this.toggleExpanded(bookmark)}
                    @bookmark-use=${() => this.handleBookmarkUse(bookmark)}
                  ></zalozky-link>
                `
              })}
            </div>
            <div class="stats">
              <strong>${visible.length}</strong> ${formatCount('app.bookmarks', visible.length)}
            </div>
          </section>
        </section>
      </main>

      ${this.showBookmarkDialog ? html`
        <zalozky-link-editor
          ?open=${this.showBookmarkDialog}
          mode=${this.bookmarkFormMode}
          .bookmark=${this.bookmarkForm}
          .allTags=${this.allTags}
          .locale=${this.locale}
          @close-editor=${this.closeBookmarkDialog}
          @save-bookmark=${this.saveBookmarkForm}
        ></zalozky-link-editor>
      ` : ''}

      ${this.showWidgetDialog ? html`
        <zalozky-widget-editor
          ?open=${this.showWidgetDialog}
          mode=${this.widgetFormMode}
          .widget=${this.widgetForm}
          .allTags=${this.allTags}
          .locale=${this.locale}
          @close-editor=${this.closeWidgetDialog}
          @save-widget=${this.saveWidgetForm}
        ></zalozky-widget-editor>
      ` : ''}
    `
  }

  static get styles() {
    return css`
      :host {
        --bg: #f5f7fb;
        --panel: rgba(255, 255, 255, 0.9);
        --panel-strong: #ffffff;
        --ink: #1f2937;
        --muted: #64748b;
        --accent: #2563eb;
        --accent-text: #ffffff;
        --border: #dfe7f1;
        --shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
        --chip-bg: #eef2ff;
        --chip-text: #1f2937;
        --field-bg: rgba(255,255,255,0.75);
        --field-text: #1f2937;
        --button-text: #ffffff;
        --button-bg: #2563eb;
        --backdrop: rgba(15, 23, 42, 0.42);
        --source-badge: rgba(255,255,255,0.72);
        --source-text: #1f2937;
        --delete-bg: rgba(254, 226, 226, 0.9);
        --delete-text: #b91c1c;
        --dialog-bg: #ffffff;
        --dialog-surface: #ffffff;
        --dialog-text: #1f2937;
        --dialog-muted: #475569;
        --dialog-border: #dfe7f1;
        --danger: #b91c1c;
        --danger-bg: #fee2e2;
        display: block;
        min-height: 100vh;
        background: linear-gradient(180deg, var(--bg) 0%, color-mix(in srgb, var(--bg) 90%, var(--panel-strong)) 100%);
        color: var(--ink);
        font-family: Inter, 'Segoe UI', sans-serif;
      }

      * { box-sizing: border-box; }

      .app-shell {
        
        padding: 32px 20px 48px;
      }
      
      header {
        display: flex;
        gap: 1rem;
        padding-bottom: 1rem;
      }

      header label {
        flex: 1;
      }

      .search-box {
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: min(100%, 360px);
        color: var(--muted);
        font-weight: 600;
      }

      .theme-button,
      .auth-button,
      .add-primary-button,
      .add-menu-trigger {
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 12px 14px;
        cursor: pointer;
        font-weight: 600;
        transition: filter 150ms ease;
      }

      .add-menu-wrap {
        position: relative;
      }

      .add-split-button {
        display: inline-flex;
        align-items: stretch;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 10px 22px rgba(37, 99, 235, 0.12);
      }

      .add-primary-button {
        background: var(--button-bg);
        border-color: var(--button-bg);
        color: var(--button-text);
        border-right: 1px solid rgba(255, 255, 255, 0.22);
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
        min-width: 152px;
      }

      .add-menu-trigger {
        background: var(--button-bg);
        border-color: var(--button-bg);
        color: var(--button-text);
        border-left: none;
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        min-width: 42px;
        font-size: 1.1rem;
        line-height: 1;
      }

      .add-dropdown {
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        display: grid;
        min-width: 180px;
        background: var(--panel-strong);
        border: 1px solid var(--border);
        border-radius: 12px;
        box-shadow: 0 18px 32px var(--shadow), 0 8px 18px rgba(15, 23, 42, 0.12);
        padding: 8px;
        z-index: 25;
      }

      .add-option {
        appearance: none;
        border: none;
        border-radius: 10px;
        background: transparent;
        color: var(--ink);
        text-align: left;
        padding: 10px 12px;
        cursor: pointer;
        font: inherit;
        font-weight: 600;
      }

      .add-option:hover {
        background: rgba(148, 163, 184, 0.08);
      }

      .theme-button:hover,
      .auth-button:hover,
      .add-primary-button:hover,
      .add-menu-trigger:hover,
      .user-avatar-button:hover,
      .user-menu-item:hover {
        filter: brightness(1.06);
      }

      .theme-button {
        background: var(--panel-strong);
        color: var(--ink);
      }

      .auth-button {
        background: var(--ink);
        color: var(--bg);
      }

      .user-menu-wrap {
        position: relative;
      }

      .user-avatar-button {
        width: 42px;
        height: 42px;
        border: 1px solid var(--border);
        border-radius: 50%;
        padding: 0;
        overflow: hidden;
        background: var(--panel-strong);
        cursor: pointer;
        display: grid;
        place-items: center;
        color: var(--ink);
        box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
      }

      .user-avatar-button img,
      .user-menu-header img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .user-avatar-button span,
      .user-menu-header span {
        display: grid;
        place-items: center;
        width: 100%;
        height: 100%;
        font-weight: 700;
        font-size: 0.8rem;
        background: linear-gradient(135deg, var(--accent), #7c3aed);
        color: var(--accent-text);
      }

      .user-menu {
        position: absolute;
        right: 0;
        top: calc(100% + 10px);
        min-width: 220px;
        background: var(--panel-strong);
        border: 1px solid var(--border);
        border-radius: 14px;
        box-shadow: 0 18px 32px var(--shadow), 0 8px 18px rgba(15, 23, 42, 0.12);
        padding: 10px;
        z-index: 30;
      }

      .user-menu-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px 8px 10px;
        border-bottom: 1px solid var(--border);
        margin-bottom: 8px;
      }

      .user-menu-header img {
        width: 32px;
        height: 32px;
        border-radius: 50%;
      }

      .user-menu-header span {
        width: 32px;
        height: 32px;
        border-radius: 50%;
      }

      .user-menu-header strong {
        display: block;
        color: var(--ink);
        font-size: 0.9rem;
        line-height: 1.3;
      }

      .user-menu-item {
        position: relative;
        width: 100%;
        appearance: none;
        border: none;
        background: rgba(148, 163, 184, 0.08);
        color: var(--ink);
        padding: 10px 10px;
        border-radius: 10px;
        cursor: pointer;
        font: inherit;
        font-weight: 600;
        text-align: left;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
        overflow: hidden;
        transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease;
      }

      .user-menu-item:hover {
        background: rgba(37, 99, 235, 0.08);
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
        transform: translateY(-1px);
      }

      .user-menu-item:active {
        transform: translateY(0);
      }

      .user-menu-item::after {
        content: "";
        position: absolute;
        inset: 0;
        background: rgba(255, 255, 255, 0.16);
        border-radius: inherit;
        opacity: 0;
        transform: scale(0.6);
        transition: opacity 180ms ease, transform 320ms ease;
      }

      .user-menu-item:active::after {
        opacity: 1;
        transform: scale(1.6);
        animation: menu-ripple 480ms ease-out;
      }

      @keyframes menu-ripple {
        0% {
          opacity: 0.7;
          transform: scale(0.6);
        }
        100% {
          opacity: 0;
          transform: scale(1.8);
        }
      }

      .material-symbols {
        font-family: 'Material Symbols Rounded', 'Segoe UI Symbol', sans-serif;
        font-size: 18px;
        line-height: 1;
        font-weight: 400;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
      }

      .auth-message {
        margin: 0 0 18px;
        color: var(--muted);
        font-size: 0.9rem;
      }

      .search-box input {
        width: 100%;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: var(--field-bg);
        padding: 12px 14px;
        font: inherit;
        color: var(--field-text);
      }

      .layout {
        display: grid;
        grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
        gap: 22px;
        align-items: start;
      }

      .results {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 18px;
        box-shadow: var(--shadow);
      }

      .results {
        padding: 18px;
      }

      .stats {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        margin-top: 16px;
        color: var(--muted);
        font-size: 0.9rem;
      }

      .stats strong {
        color: var(--ink);
        margin-right: 6px;
      }

      .bookmark-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(18rem, 24rem));
        grid-auto-flow: dense;
        gap: 16px;
      }

      .bookmark-card {
        display: flex;
        flex-direction: column;
        gap: 14px;
        min-height: 190px;
        padding: 16px;
        border-radius: 16px;
        border: 2px solid;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.4);
        color: #111827;
        transition: transform 150ms ease, box-shadow 150ms ease;
        position: relative;
      }

      .bookmark-controls {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        min-height: 30px;
      }

      .bookmark-source {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.62rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        padding: 5px 8px;
        border-radius: 999px;
        border: 1px solid rgba(17, 24, 39, 0.08);
        background: rgba(255,255,255,0.72);
      }

      .source-icon {
        font-size: 0.8rem;
        line-height: 1;
      }

      .bookmark-source.firebase {
        background: rgba(79, 70, 229, 0.12);
        color: #312e81;
      }

      .bookmark-source.local {
        background: rgba(22, 163, 74, 0.1);
        color: #166534;
      }

      .bookmark-card.expanded {
        grid-column: span 2;
      }

      .bookmark-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 22px rgba(31,41,55,0.12);
      }

      .bookmark-link {
        display: flex;
        flex-direction: column;
        gap: 14px;
        flex: 1;
        color: inherit;
        text-decoration: none;
      }

      .bookmark-action,
      .expand-toggle {
        width: 28px;
        height: 28px;
        border: 1px solid rgba(17,24,39,0.12);
        border-radius: 999px;
        background: rgba(255,255,255,0.6);
        color: #111827;
        cursor: pointer;
        font-size: 1rem;
        line-height: 1;
        display: grid;
        place-items: center;
        flex-shrink: 0;
      }

      .bookmark-detail {
        display: flex;
        align-items: center;
        justify-content: center;
        padding-top: 4px;
        border-top: 1px solid rgba(17,24,39,0.08);
      }

      .qr-wrap {
        width: min(180px, 100%);
        padding: 12px;
        border-radius: 14px;
        background: rgba(255,255,255,0.8);
        box-shadow: 0 10px 20px rgba(15,23,42,0.08);
      }

      .qr-wrap img {
        display: block;
        width: 100%;
        height: auto;
        aspect-ratio: 1;
      }

      .bookmark-top {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }

      .bookmark-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        background: rgba(255,255,255,0.5);
        font-size: 1.6rem;
        line-height: 1;
        overflow: hidden;
      }

      .bookmark-icon img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .bookmark-meta {
        min-width: 0;
        flex: 1;
      }

      .bookmark-meta h3 {
        margin: 0 0 4px;
        font-size: 1.08rem;
        line-height: 1.3;
      }

      .bookmark-meta span {
        display: block;
        font-size: 0.7rem;
        line-height: 1.45;
        color: rgba(17,24,39,0.74);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .description {
        margin: 0;
        color: rgba(17,24,39,0.8);
        font-size: 0.92rem;
        line-height: 1.5;
      }

      .tag-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: auto;
      }

      .tag {
        display: inline-flex;
        align-items: center;
        background: rgba(255,255,255,0.5);
        border: 1px solid rgba(17,24,39,0.08);
        color: rgba(17,24,39,0.85);
        border-radius: 999px;
        padding: 4px 8px;
        font-size: 0.68rem;
        font-weight: 700;
      }

      .add-bookmark-fab {
        position: fixed;
        right: 24px;
        bottom: 24px;
        width: 58px;
        height: 58px;
        border: none;
        border-radius: 999px;
        background: linear-gradient(135deg, #2563eb, #7c3aed);
        color: white;
        font-size: 2rem;
        line-height: 1;
        box-shadow: 0 18px 30px rgba(37, 99, 235, 0.35);
        cursor: pointer;
      }

      .dialog-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.42);
        display: grid;
        place-items: center;
        padding: 20px;
        z-index: 20;
      }

      .dialog {
        width: min(760px, 100%);
        max-height: 90vh;
        overflow: auto;
        background: white;
        border-radius: 20px;
        box-shadow: 0 24px 50px rgba(15, 23, 42, 0.18);
        border: 1px solid var(--border);
      }

      .dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 22px 12px;
        border-bottom: 1px solid rgba(17,24,39,0.08);
      }

      .dialog-header h2 {
        margin: 0;
        font-size: 1.35rem;
      }

      .close-button {
        width: 32px;
        height: 32px;
        border-radius: 999px;
        border: 1px solid rgba(17,24,39,0.12);
        background: transparent;
        font-size: 1.3rem;
        cursor: pointer;
      }

      .bookmark-form {
        display: grid;
        gap: 18px;
        padding: 22px;
      }

      .field {
        display: grid;
        gap: 8px;
        color: var(--ink);
        font-weight: 600;
      }

      .field span {
        color: rgba(17,24,39,0.8);
      }

      .field input,
      .field textarea,
      .tag-input-row input {
        width: 100%;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: rgba(255,255,255,0.9);
        padding: 11px 12px;
        font: inherit;
        color: var(--ink);
      }

      .field-row {
        display: grid;
        grid-template-columns: 1.2fr 1fr;
        gap: 14px;
      }

      .color-row {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
      }

      .color-picker-field {
        display: grid;
        gap: 8px;
        color: rgba(17,24,39,0.8);
        font-weight: 600;
      }

      .color-picker-field input {
        width: 100%;
        height: 48px;
        min-width: 0;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: white;
        padding: 6px;
        cursor: pointer;
      }

      .dialog-preview {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 10px;
        padding: 12px 14px;
        min-height: 76px;
        border-radius: 14px;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.45);
        text-align: left;
      }

      .dialog-preview-copy {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
        min-width: 0;
        width: 100%;
        gap: 4px;
      }

      .dialog-preview-icon {
        display: grid;
        place-items: center;
        width: 42px;
        height: 42px;
        border-radius: 12px;
        background: rgba(255,255,255,0.55);
        font-size: 1.5rem;
        flex-shrink: 0;
      }

      .dialog-preview strong,
      .dialog-preview small {
        display: block;
      }

      .dialog-preview strong {
        font-size: 1rem;
        line-height: 1.25;
        font-weight: 700;
      }

      .dialog-preview small {
        font-size: 0.72rem;
        line-height: 1.4;
        color: inherit;
        opacity: 0.8;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .tag-picker {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .tag-choice {
        border: 1px solid var(--border);
        background: #eef2ff;
        color: var(--ink);
        border-radius: 999px;
        padding: 7px 12px;
        font-size: 0.76rem;
        font-weight: 700;
        cursor: pointer;
      }

      .tag-choice.selected {
        background: var(--accent);
        color: white;
        border-color: var(--accent);
      }

      .tag-input-row {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }

      .secondary-button,
      .primary-button {
        border-radius: 12px;
        border: 1px solid var(--border);
        padding: 11px 14px;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }

      .secondary-button {
        background: white;
        color: var(--ink);
      }

      .primary-button {
        background: var(--accent);
        border-color: var(--accent);
        color: white;
      }

      .form-error {
        margin: 0;
        color: #b91c1c;
        font-weight: 600;
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 4px;
      }

      @media (max-width: 760px) {
        .toolbar {
          flex-direction: column;
          align-items: stretch;
        }

        .layout {
          grid-template-columns: 1fr;
        }

        .tag-panel {
          position: static;
        }
      }
    `
  }
}



if (!customElements.get('zalozky-app')) {
  customElements.define('zalozky-app', ZalozkyApp)
}
