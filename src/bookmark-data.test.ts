import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { HTMLFragmentEditor } from './html-fragment-editor'
import { ZalozkyLink } from './zalozky-link'
import { ZalozkyLinkEditor } from './zalozky-link-editor'
import { ZalozkyTags } from './zalozky-tags'
import { ZalozkyWidgetEditor } from './zalozky-widget-editor'
import {
  calculateBookmarkScore,
  matchesBookmark,
  normalizeUsageHistory,
  parseQuery,
  recordBookmarkUsage,
  reconcileBookmarks,
  sortBookmarksByProbability
} from './bookmark-data'

describe('bookmark query parsing', () => {
  it('supports English and Slovak locale switching', async () => {
    const { formatCount, getCurrentLocale, setLocale, t } = await import('./i18n')

    setLocale('sk')
    expect(getCurrentLocale()).toBe('sk')
    expect(t('app.searchPlaceholder')).toBe('Hľadaj kľúčové slová alebo tagy:docs && web')
    expect(formatCount('app.bookmarks', 1)).toBe('záložka')
    expect(formatCount('app.bookmarks', 2)).toBe('záložky')
    expect(formatCount('app.bookmarks', 5)).toBe('záložiek')

    setLocale('en')
    expect(getCurrentLocale()).toBe('en')
    expect(t('app.searchPlaceholder')).toBe('Search keywords or tags:docs && web')
    expect(formatCount('app.bookmarks', 1)).toBe('bookmark')
    expect(formatCount('app.bookmarks', 2)).toBe('bookmarks')
    expect(formatCount('app.bookmarks', 5)).toBe('bookmarks')
  })

  it('treats tags as logical and when repeated', () => {
    const query = ':docs :dev'
    const parsed = parseQuery(query)

    expect(parsed).toHaveLength(3)
    expect(parsed[0]).toMatchObject({ type: 'tag', value: 'docs' })
    expect(parsed[1]).toMatchObject({ type: 'and', value: '&&' })
    expect(parsed[2]).toMatchObject({ type: 'tag', value: 'dev' })
  })

  it('evaluates boolean operators and tag matches', () => {
    const bookmark = {
      title: 'Lit Guide',
      description: 'Developer docs for Web Components',
      tags: ['docs', 'web', 'dev']
    }

    expect(matchesBookmark(bookmark, ':docs && web')).toBe(true)
    expect(matchesBookmark(bookmark, ':dev && !:web')).toBe(false)
    expect(matchesBookmark(bookmark, 'guide || web')).toBe(true)
  })

  it('matches bookmarks by URL when the legacy local ID differs from the Firestore document ID', () => {
    const reconciled = reconcileBookmarks(
      [
        { id: 'https-developer-mozilla-org-257986', title: 'MDN', url: 'https://developer.mozilla.org/', tags: ['docs'] },
        { id: 'legacy-local', title: 'Local only', url: 'https://local.example', tags: ['local'] }
      ],
      [
        { id: 'mYMXxzkGtABzvgY8KdDb', title: 'MDN', url: 'https://developer.mozilla.org/', tags: ['docs', 'firebase'] }
      ]
    )

    expect(reconciled).toEqual([
      expect.objectContaining({ id: 'mYMXxzkGtABzvgY8KdDb', title: 'MDN', url: 'https://developer.mozilla.org/', source: 'firebase' }),
      expect.objectContaining({ id: 'legacy-local', title: 'Local only', deleted: true, source: 'local' })
    ])
  })

  it('prefers the Firebase document ID over the legacy local ID during edit updates', async () => {
    const { ZalozkyApp } = await import('./zalozky-app')
    const element = new ZalozkyApp()
    element.bookmarks = [
      { id: 'mYMXxzkGtABzvgY8KdDb', source: 'firebase', url: 'https://developer.mozilla.org/' },
      { id: 'https-developer-mozilla-org-257986', source: 'local', url: 'https://developer.mozilla.org/' }
    ]

    expect(element.getFirebaseBookmarkIdForUrl('https://developer.mozilla.org/')).toBe('mYMXxzkGtABzvgY8KdDb')
  })

  it('updates an edited bookmark in place when the URL changes instead of creating a duplicate', async () => {
    const { ZalozkyApp } = await import('./zalozky-app')
    const element = new ZalozkyApp()
    element.bookmarks = [
      { id: 'bookmark-123', type: 'bookmark', title: 'Original', url: 'https://old.example', source: 'local' }
    ]

    await element.saveBookmarkForm({
      detail: {
        mode: 'edit',
        bookmark: {
          id: 'bookmark-123',
          type: 'bookmark',
          title: 'Updated title',
          url: 'https://new.example',
          description: '',
          icon: '🔗',
          tags: [],
          isSearch: false,
          usageHistory: [],
          createdAtMs: 0,
          source: 'local'
        }
      }
    })

    expect(element.bookmarks.filter((item) => item.id === 'bookmark-123')).toHaveLength(1)
    expect(element.bookmarks.find((item) => item.id === 'bookmark-123')).toMatchObject({
      url: 'https://new.example',
      title: 'Updated title'
    })
  })

  it('updates an edited widget in place when the HTML changes instead of creating a duplicate', async () => {
    const { ZalozkyApp } = await import('./zalozky-app')
    const element = new ZalozkyApp()
    element.bookmarks = [
      { id: 'widget-456', type: 'widget', title: 'Original widget', html: '<p>old</p>', source: 'local' }
    ]

    await element.saveWidgetForm({
      detail: {
        mode: 'edit',
        widget: {
          id: 'widget-456',
          type: 'widget',
          title: 'Updated widget',
          html: '<p>new</p>',
          tags: [],
          background: '#ecfeff',
          borderColor: '#06b6d4',
          foregroundColor: '#111827',
          usageHistory: [],
          createdAtMs: 0,
          source: 'local'
        }
      }
    })

    expect(element.bookmarks.filter((item) => item.id === 'widget-456')).toHaveLength(1)
    expect(element.bookmarks.find((item) => item.id === 'widget-456')).toMatchObject({
      html: '<p>new</p>',
      title: 'Updated widget'
    })
  })

  it('removes a bookmark from the current list when delete is requested', async () => {
    const { ZalozkyApp } = await import('./zalozky-app')
    const element = new ZalozkyApp()
    element.bookmarks = [
      { id: 'keep', title: 'Keep', url: 'https://example.com/keep', source: 'local' },
      { id: 'remove', title: 'Remove', url: 'https://example.com/remove', source: 'local' }
    ]

    await element.deleteBookmark({ id: 'remove', title: 'Remove', url: 'https://example.com/remove', source: 'local' })

    expect(element.bookmarks).toHaveLength(1)
    expect(element.bookmarks[0].id).toBe('keep')
  })

  it('keeps foregroundColor in bookmark data during reconciliation', () => {
    const reconciled = reconcileBookmarks(
      [{ id: 'a', title: 'MDN', url: 'https://developer.mozilla.org/', foregroundColor: '#223344' }],
      [{ id: 'b', title: 'MDN', url: 'https://developer.mozilla.org/', foregroundColor: '#556677' }]
    )

    expect(reconciled[0]).toMatchObject({
      url: 'https://developer.mozilla.org/',
      foregroundColor: '#556677',
      source: 'firebase'
    })
  })

  it('marks local-only entries as deleted during Firebase reconciliation', () => {
    const reconciled = reconcileBookmarks(
      [
        { id: 'a', title: 'Local only', url: 'https://local.example', tags: ['local'] },
        { id: 'b', title: 'Shared', url: 'https://shared.example', tags: ['shared'] }
      ],
      [
        { id: 'b', title: 'Shared', url: 'https://shared.example', tags: ['shared', 'firebase'] }
      ]
    )

    expect(reconciled).toEqual([
      expect.objectContaining({ id: 'b', title: 'Shared', source: 'firebase' }),
      expect.objectContaining({ id: 'a', title: 'Local only', deleted: true, source: 'local' })
    ])
  })

  it('keeps the editor draft form and tag fields reactive in Lit', () => {
    expect(ZalozkyLinkEditor.properties).toHaveProperty('form')
    expect(ZalozkyLinkEditor.properties).toHaveProperty('formTagInput')
    expect(ZalozkyLinkEditor.properties).toHaveProperty('formError')

    const editor = new ZalozkyLinkEditor()
    editor.bookmark = { url: 'https://example.com', tags: ['docs'] }
    editor.syncFormFromBookmark()
    editor.toggleFormTag('dev')

    expect(editor.selectedTags).toEqual(['docs', 'dev'])
  })

  it('uses a single generic tag picker instead of a separate selected-tag list', () => {
    const source = readFileSync(new URL('./zalozky-link-editor.ts', import.meta.url), 'utf8')

    expect(source).toContain('class=${this.selectedTags.includes(tag) ? \'tag-choice selected\' : \'tag-choice\'}')
    expect(source).not.toContain('selected-tags-inline')
    expect(source).not.toContain('selected-tag-remove')
  })

  it('adds a newly typed tag to the visible editor tag list immediately', () => {
    const editor = new ZalozkyLinkEditor()
    editor.allTags = ['docs']
    editor.form = { ...editor.emptyBookmarkForm(), tags: ['docs'] }
    editor.formTagInput = 'design'

    editor.addFormTag()

    expect(editor.form.tags).toEqual(['docs', 'design'])
    expect(editor.allTags).toContain('design')
  })

  it('opens a right-click menu and hides the source badge on cards', async () => {
    const { ZalozkyWidget } = await import('./zalozky-widget')
    const { ZalozkyLink } = await import('./zalozky-link')

    const createMenuStub = () => {
      const classes = new Set()
      return {
        classList: {
          add: (className) => classes.add(className),
          remove: (className) => classes.delete(className),
          contains: (className) => classes.has(className)
        }
      }
    }

    const linkMenu = createMenuStub()
    const link = new ZalozkyLink()
    Object.defineProperty(link, 'shadowRoot', {
      configurable: true,
      value: {
        querySelector: (selector) => (selector === '.bookmark-menu' ? linkMenu : null),
        querySelectorAll: (selector) => (selector === '.bookmark-menu' ? [linkMenu] : [])
      }
    })

    expect(link.shadowRoot.querySelector('.bookmark-source')).toBeNull()
    expect(link.shadowRoot.querySelector('.menu-toggle')).toBeNull()
    link.openContextMenu({ preventDefault() {}, stopPropagation() {} })
    expect(linkMenu.classList.contains('open')).toBe(true)

    const widgetMenu = createMenuStub()
    const widget = new ZalozkyWidget()
    Object.defineProperty(widget, 'shadowRoot', {
      configurable: true,
      value: {
        querySelector: (selector) => (selector === '.widget-menu' ? widgetMenu : null),
        querySelectorAll: (selector) => (selector === '.widget-menu' ? [widgetMenu] : [])
      }
    })

    expect(widget.shadowRoot.querySelector('.widget-source')).toBeNull()
    expect(widget.shadowRoot.querySelector('.menu-toggle')).toBeNull()
    widget.openContextMenu({ preventDefault() {}, stopPropagation() {} })
    expect(widgetMenu.classList.contains('open')).toBe(true)
  })

  it('supports search-mode bookmarks in the bookmark model and UI', () => {
    const editor = new ZalozkyLinkEditor()
    editor.bookmark = { url: 'https://example.com/search?q=%s', isSearch: true, tags: ['search'] }
    editor.syncFormFromBookmark()
    expect(editor.form.isSearch).toBe(true)

    const link = new ZalozkyLink()
    link.isSearch = true
    link.url = 'https://example.com/search?q=%s'
    link.searchValue = 'cats & dogs'

    const originalLocation = globalThis.location
    const assign = vi.fn()
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: { assign }
    })

    try {
      link.handleSearchSubmit({ preventDefault() {} })
      expect(assign).toHaveBeenCalledWith('https://example.com/search?q=cats%20%26%20dogs')
    } finally {
      Object.defineProperty(globalThis, 'location', {
        configurable: true,
        value: originalLocation
      })
    }
  })

  it('does not reorder the visible bookmark list while recording a click for the next reload', async () => {
    const { ZalozkyApp } = await import('./zalozky-app')
    const element = new ZalozkyApp()
    const referenceDate = new Date('2024-01-10T12:00:00')
    element.bookmarks = [
      { id: 'a', title: 'A', url: 'https://example.com/a', createdAtMs: 1, usageHistory: [new Date('2024-01-09T12:00:00').getTime()], source: 'local' },
      { id: 'b', title: 'B', url: 'https://example.com/b', createdAtMs: 2, usageHistory: [new Date('2024-01-10T11:00:00').getTime()], source: 'local' }
    ]
    element.sortingReferenceTime = referenceDate

    const before = element.visibleBookmarks.map((bookmark) => bookmark.id)
    element.handleBookmarkUse(element.bookmarks[0])
    const after = element.visibleBookmarks.map((bookmark) => bookmark.id)

    expect(before).toEqual(['b', 'a'])
    expect(after).toEqual(before)
  })

  it('sorts widgets ahead of bookmarks when ranking visible results', () => {
    const referenceDate = new Date('2024-01-10T12:00:00')
    const sorted = sortBookmarksByProbability([
      { id: 'bookmark', type: 'bookmark', title: 'Alpha', url: 'https://example.com/a', createdAtMs: 1 },
      { id: 'widget', type: 'widget', title: 'Beta', tags: ['status'], createdAtMs: 2 }
    ], referenceDate)

    expect(sorted.map((item) => item.id)).toEqual(['widget', 'bookmark'])
  })

  it('supports tag and title matching for widget entries', () => {
    const widget = { type: 'widget', title: 'Status board', tags: ['ops', 'dashboard'], html: '<strong>ok</strong>' }
    expect(matchesBookmark(widget, ':ops && dashboard')).toBe(true)
    expect(matchesBookmark(widget, 'status')).toBe(true)
    expect(matchesBookmark(widget, 'widget-unknown')).toBe(false)
  })

  it('supports widget URLs in the editor and navigates on card click', async () => {
    const { ZalozkyWidget } = await import('./zalozky-widget')
    const { ZalozkyWidgetEditor } = await import('./zalozky-widget-editor')

    const editor = new ZalozkyWidgetEditor()
    editor.widget = { type: 'widget', title: 'Weather', url: 'https://example.com/weather', html: '<div>sun</div>' }
    editor.syncFormFromWidget()

    expect(editor.form.url).toBe('https://example.com/weather')

    const widget = new ZalozkyWidget()
    widget.url = 'https://example.com/weather'

    const originalLocation = globalThis.location
    const assign = vi.fn()
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: { assign }
    })

    try {
      widget.handleCardClick({ preventDefault() {}, stopPropagation() {} })
      expect(assign).toHaveBeenCalledWith('https://example.com/weather')
    } finally {
      Object.defineProperty(globalThis, 'location', {
        configurable: true,
        value: originalLocation
      })
    }
  })

  it('exposes background, border, and text color controls for widget cards', () => {
    const editor = new ZalozkyWidgetEditor()
    editor.isOpen = true
    editor.widget = {
      title: 'Weather',
      url: 'https://example.com/weather',
      html: '<div>sun</div>',
      background: '#ff0000',
      borderColor: '#00ff00',
      foregroundColor: '#0000ff'
    }
    editor.syncFormFromWidget()

    expect(editor.form.background).toBe('#ff0000')
    expect(editor.form.borderColor).toBe('#00ff00')
    expect(editor.form.foregroundColor).toBe('#0000ff')
    expect(editor.form).toHaveProperty('background')
    expect(editor.form).toHaveProperty('borderColor')
    expect(editor.form).toHaveProperty('foregroundColor')
  })

  it('creates a reusable HTML fragment editor component', () => {
    const editor = new HTMLFragmentEditor()
    editor.value = '<div>sun</div>'

    expect(editor.value).toContain('sun')
    expect(editor.constructor.name).toBe('HTMLFragmentEditor')
  })

  it('keeps widget editor form values reactive and saveable', () => {
    const editor = new ZalozkyWidgetEditor()
    editor.widget = { type: 'widget', title: 'Weather', tags: ['local'], html: '<div>sun</div>' }
    editor.syncFormFromWidget()
    editor.toggleFormTag('ops')

    expect(editor.selectedTags).toEqual(['local', 'ops'])
    expect(editor.form.html).toContain('sun')
  })

  it('injects a shadowRoot binding before widget scripts run', async () => {
    const { ZalozkyWidget } = await import('./zalozky-widget')
    const originalDocument = globalThis.document
    const originalWindow = globalThis.window
    const shadowRootLike = { ownerDocument: { title: 'mock-doc' }, getElementById: () => ({ id: 'temperature' }) }

    const windowMock = { __widgetCheck: false } as any
    ;(globalThis as any).window = windowMock
    ;(globalThis as any).document = {
      createElement(tag: string) {
        return {
          innerHTML: '',
          querySelectorAll() {
            return [{
              textContent: 'window.__widgetCheck = !!shadowRoot;\nwindow.__rootCheck = shadowRoot && typeof shadowRoot.getElementById === "function";',
              remove() {}
            }]
          },
          appendChild() {},
          ownerDocument: { title: 'mock-doc' }
        } as any
      }
    } as any

    try {
      const widget = new ZalozkyWidget()
      Object.defineProperty(widget, 'shadowRoot', {
        value: { querySelector: () => ({
          getRootNode: () => shadowRootLike,
          ownerDocument: { title: 'mock-doc' },
          appendChild() {},
          innerHTML: ''
        }) },
        configurable: true
      })

      widget.html = '<div id="box">Weather</div><script>window.__widgetCheck = !!shadowRoot; window.__rootCheck = !!shadowRoot.getElementById;</script>'
      widget.renderWidgetHtml()

      expect((globalThis as any).window.__widgetCheck).toBe(true)
      expect((globalThis as any).window.__rootCheck).toBe(true)
    } finally {
      globalThis.document = originalDocument
      globalThis.window = originalWindow
    }
  })

  it('weights clicks around midnight highly when evaluating near the boundary', () => {
    const referenceDate = new Date('2024-01-01T00:15:00')
    const clickTs = new Date('2024-01-01T23:30:00').getTime()
    const score = calculateBookmarkScore({ usageHistory: [clickTs] }, referenceDate)

    expect(score).toBeGreaterThan(0.9)
  })

  it('applies the weekday similarity weights in descending order', () => {
    const monday = new Date('2024-01-01T09:00:00')
    const tuesday = new Date('2024-01-02T09:00:00')
    const saturday = new Date('2024-01-06T09:00:00')

    const mondayScore = calculateBookmarkScore({ usageHistory: [monday.getTime()] }, tuesday)
    const tuesdayScore = calculateBookmarkScore({ usageHistory: [tuesday.getTime()] }, tuesday)
    const saturdayScore = calculateBookmarkScore({ usageHistory: [monday.getTime()] }, saturday)

    expect(mondayScore).toBeGreaterThan(saturdayScore)
    expect(tuesdayScore).toBeGreaterThan(mondayScore)
    expect(tuesdayScore).toBeGreaterThan(0.9)
    expect(mondayScore).toBeGreaterThan(0.5)
    expect(saturdayScore).toBeLessThan(0.3)
  })

  it('ignores duplicate usage clicks within the debounce window and caps history length at 50', () => {
    const initial = [new Date('2024-01-01T00:00:00').getTime()]
    const debounced = recordBookmarkUsage(initial, initial[0] + 15_000)
    expect(debounced).toEqual(initial)

    const values = Array.from({ length: 55 }, (_, index) => new Date('2024-01-01T00:00:00').getTime() + (index + 1) * 60_000)
    const expanded = values.reduce((history, ts) => recordBookmarkUsage(history, ts), [])

    expect(expanded).toHaveLength(50)
    expect(normalizeUsageHistory(expanded)).toEqual(expanded)
  })

  it('merges usage histories without duplicates and marks entries that need Firebase sync', () => {
    const local = [{ id: 'a', url: 'https://example.com', usageHistory: [300, 200, 200, 100] }]
    const firebase = [{ id: 'a', url: 'https://example.com', usageHistory: [500, 300, 100, 700] }]

    const merged = reconcileBookmarks(local, firebase)

    expect(merged[0].usageHistory).toEqual([100, 200, 300, 500, 700])
    expect(merged[0].needsFirebaseSync).toBe(true)
  })

  it('sorts bookmarks by recency probability and breaks ties by creation date then title', () => {
    const referenceDate = new Date('2024-01-10T12:00:00')
    const bookmarks = [
      { id: 'older', title: 'Alpha', createdAtMs: 1, usageHistory: [new Date('2024-01-09T12:00:00').getTime()] },
      { id: 'newer', title: 'Beta', createdAtMs: 2, usageHistory: [new Date('2024-01-09T12:00:00').getTime()] },
      { id: 'same', title: 'Gamma', createdAtMs: 2, usageHistory: [new Date('2024-01-09T12:00:00').getTime()] }
    ]

    const sorted = sortBookmarksByProbability(bookmarks, referenceDate)
    expect(sorted.map((bookmark) => bookmark.id)).toEqual(['newer', 'same', 'older'])
  })

  it('converts fetched icon URLs to data URLs and preserves empty state on failures', async () => {
    const editor = new ZalozkyLinkEditor()
    const originalFetch = globalThis.fetch

    globalThis.fetch = async () => new Response(new Blob([Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], { type: 'image/png' }))
    const okResult = await editor.fetchImageAsDataUrl('https://example.com/icon.png')
    expect(okResult).toMatch(/^data:image\/png;base64,/)

    globalThis.fetch = async () => {
      throw new Error('network down')
    }
    const failedResult = await editor.fetchImageAsDataUrl('https://example.com/missing.png')
    expect(failedResult).toBe('')

    globalThis.fetch = originalFetch
  })

  it('filters tag results and emits cumulative toggles from the tag panel', () => {
    const panel = new ZalozkyTags()
    panel.tags = ['design', 'docs', 'dev']
    panel.filterText = 'd'

    expect(panel.visibleTags).toEqual(['design', 'dev', 'docs'])

    const emitSpy = vi.fn()
    panel.addEventListener('tag-toggle', emitSpy)
    panel.handleTagClick({ ctrlKey: true, metaKey: false }, 'docs')
    panel.handleFilterInput({ target: { value: 'dev' } })
    panel.emitTagFilter('dev')

    expect(emitSpy).toHaveBeenCalledTimes(1)
    expect(emitSpy.mock.calls[0][0].detail).toMatchObject({ tag: 'docs', cumulative: true })
    expect(panel.filterText).toBe('dev')
  })

  it('supports touch long-press tag toggles and clears timers on leave', () => {
    const panel = new ZalozkyTags()
    const emitSpy = vi.fn()
    panel.addEventListener('tag-toggle', emitSpy)

    const originalWindow = globalThis.window
    const originalSetTimeout = globalThis.setTimeout
    const originalClearTimeout = globalThis.clearTimeout
    const timeouts: number[] = []

    ;(globalThis as any).window = {
      setTimeout: ((handler: any, timeout?: number) => {
        const id = Date.now() + Math.random()
        timeouts.push(id as any)
        return id as any
      }) as any,
      clearTimeout: ((id: any) => {
        const index = timeouts.indexOf(id)
        if (index >= 0) timeouts.splice(index, 1)
      }) as any
    }
    globalThis.setTimeout = (globalThis as any).window.setTimeout
    globalThis.clearTimeout = (globalThis as any).window.clearTimeout

    try {
      panel.handlePointerDown({ pointerType: 'touch' }, 'docs')
      panel.handlePointerLeave()

      expect(emitSpy).not.toHaveBeenCalled()
      panel.handlePointerDown({ pointerType: 'touch' }, 'docs')
      panel.handlePointerUp()
      expect(emitSpy).not.toHaveBeenCalled()
    } finally {
      ;(globalThis as any).window = originalWindow
      globalThis.setTimeout = originalSetTimeout
      globalThis.clearTimeout = originalClearTimeout
    }
  })

  it('exposes the widget action events and menu-open helper', async () => {
    const { ZalozkyWidget } = await import('./zalozky-widget')
    const widget = new ZalozkyWidget()

    const editSpy = vi.fn()
    const deleteSpy = vi.fn()
    widget.addEventListener('edit-request', editSpy)
    widget.addEventListener('delete-request', deleteSpy)

    widget.emitEdit()
    widget.emitDelete()
    expect(editSpy).toHaveBeenCalledTimes(1)
    expect(deleteSpy).toHaveBeenCalledTimes(1)

    const menu = { classList: { add: vi.fn(), remove: vi.fn() } }
    Object.defineProperty(widget, 'shadowRoot', {
      configurable: true,
      value: {
        querySelector: (selector) => selector === '.widget-menu' ? menu : null,
        querySelectorAll: (selector) => selector === '.widget-menu' ? [menu] : []
      }
    })

    widget.openContextMenu({ preventDefault() {}, stopPropagation() {} })
    expect(menu.classList.add).toHaveBeenCalledWith('open')
  })

  it('guards the Firebase client helpers when the app is not configured', async () => {
    const { auth, onAuthChange, signInWithGoogle, signOutUser } = await import('./firebase')
    const callback = vi.fn()
    const unsubscribe = onAuthChange(callback)

    expect(typeof unsubscribe).toBe('function')
    if (!auth) {
      expect(callback).toHaveBeenCalledWith(null)
      await expect(signInWithGoogle()).rejects.toThrow('Firebase is not configured')
    } else {
      await expect(signOutUser()).resolves.toBeUndefined()
    }

    await expect(signOutUser()).resolves.toBeUndefined()
  })

  it('validates widget-editor save paths and HTML fragment updates without a full render', () => {
    const editor = new ZalozkyWidgetEditor()
    const saveSpy = vi.fn()
    editor.addEventListener('save-widget', saveSpy)

    editor.form = { ...editor.emptyWidgetForm(), title: '', html: '' }
    editor.handleSubmit({ preventDefault() {} })
    expect(editor.formError).toContain('title')

    editor.form = { ...editor.emptyWidgetForm(), title: 'Weather', html: '<div>sun</div>' }
    editor.handleHtmlFragmentChange({ detail: { value: '<p>rain</p>' } })
    expect(editor.form.html).toBe('<p>rain</p>')

    editor.emitSave()
    expect(saveSpy).toHaveBeenCalledTimes(1)

    editor.closeDialog()
    expect(editor.form).toBeTruthy()
  })
})
