import { LitElement, css, html } from 'lit'
import { t } from './i18n'

export class ZalozkyLinkEditor extends LitElement {
  declare isOpen: boolean
  declare mode: string
  declare bookmark: Record<string, any>
  declare allTags: string[]
  declare form: Record<string, any>
  declare formTagInput: string
  declare formError: string
  declare locale: string

  static get properties() {
    return {
      isOpen: { type: Boolean, attribute: 'open' },
      mode: { type: String },
      bookmark: { type: Object },
      allTags: { type: Array },
      form: { type: Object },
      formTagInput: { type: String },
      formError: { type: String },
      locale: { type: String }
    }
  }

  constructor() {
    super()
    this.isOpen = false
    this.mode = 'create'
    this.bookmark = this.emptyBookmarkForm()
    this.allTags = []
    this.form = this.emptyBookmarkForm()
    this.formTagInput = ''
    this.formError = ''
  }

  connectedCallback() {
    super.connectedCallback()
    this.syncFormFromBookmark()
  }

  updated(changedProperties) {
    super.updated(changedProperties)
    if (changedProperties.has('bookmark')) {
      this.syncFormFromBookmark()
    }
  }

  emptyBookmarkForm() {
    return {
      id: '',
      title: '',
      url: '',
      description: '',
      icon: '',
      background: '#ecfeff',
      borderColor: '#06b6d4',
      foregroundColor: '#111827',
      tags: [],
      isSearch: false,
      source: 'local'
    }
  }

  syncFormFromBookmark() {
    const nextBookmark = this.bookmark && Object.keys(this.bookmark).length
      ? {
          ...this.emptyBookmarkForm(),
          ...this.bookmark,
          background: this.bookmark.background ?? '#ecfeff',
          borderColor: this.bookmark.borderColor ?? '#06b6d4',
          foregroundColor: this.bookmark.foregroundColor ?? '#111827',
          tags: Array.isArray(this.bookmark.tags) ? [...this.bookmark.tags] : [],
          isSearch: Boolean(this.bookmark.isSearch)
        }
      : this.emptyBookmarkForm()

    this.form = nextBookmark
    this.formTagInput = ''
    this.formError = ''
  }

  get selectedTags() {
    return this.form?.tags ?? []
  }

  addFormTag() {
    const tag = String(this.formTagInput ?? '').trim().toLowerCase()
    if (!tag) return

    const existing = this.form.tags ?? []
    const nextTags = existing.includes(tag) ? existing : [...existing, tag]

    this.allTags = Array.from(new Set([...(this.allTags ?? []), tag])).sort()
    this.form = {
      ...this.form,
      tags: nextTags
    }

    this.formTagInput = ''
  }

  toggleFormTag(tag) {
    const current = this.form.tags ?? []
    this.form = {
      ...this.form,
      tags: current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag]
    }
  }

  getDialogPreviewStyle() {
    const background = this.form?.background || '#ecfeff'
    const borderColor = this.form?.borderColor || '#06b6d4'
    const foregroundColor = this.form?.foregroundColor || '#111827'
    return `background:${background}; border:2px solid ${borderColor}; color:${foregroundColor};`
  }

  normalizeBookmarkUrl(value = '') {
    const trimmed = String(value ?? '').trim()
    if (!trimmed) return ''
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    if (/^\//.test(trimmed)) return `https:${trimmed}`
    return `https://${trimmed}`
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

  async fetchImageAsDataUrl(rawUrl) {
    const url = String(rawUrl ?? '').trim()
    if (!url) return ''
    if (url.startsWith('data:')) return url
    if (url.startsWith('blob:')) return ''

    try {
      const response = await fetch(url)
      if (!response.ok) return ''

      const blob = await response.blob()
      const mimeType = blob && blob.type ? blob.type : 'image/png'
      if (!blob || !/^image\//i.test(mimeType)) return ''

      const buffer = await blob.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binary = ''
      const chunkSize = 0x8000

      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize)
        binary += String.fromCharCode(...chunk)
      }

      const base64 = typeof btoa === 'function'
        ? btoa(binary)
        : (typeof Buffer !== 'undefined' ? Buffer.from(bytes).toString('base64') : '')

      return base64 ? `data:${mimeType};base64,${base64}` : ''
    } catch (error) {
      return ''
    }
  }

  async handleUrlBlur() {
    const url = this.normalizeBookmarkUrl(this.form.url)
    if (!url) return

    const metadata = await this.fetchBookmarkMetadata(url)
    const iconDataUrl = metadata.icon ? await this.fetchImageAsDataUrl(metadata.icon) : ''
    this.form = {
      ...this.form,
      url,
      title: this.form.title || metadata.title || '',
      description: this.form.description || metadata.description || '',
      icon: this.form.icon || iconDataUrl || ''
    }
  }

  async convertIconToDataUrl() {
    const rawUrl = String(this.form.icon ?? '').trim()
    if (!rawUrl) return

    const dataUrl = await this.fetchImageAsDataUrl(rawUrl)
    this.form = {
      ...this.form,
      icon: dataUrl || ''
    }
  }

  closeDialog() {
    this.dispatchEvent(new CustomEvent('close-editor', { bubbles: true, composed: true }))
  }

  emitSave() {
    this.dispatchEvent(new CustomEvent('save-bookmark', {
      bubbles: true,
      composed: true,
      detail: {
        mode: this.mode,
        bookmark: {
          ...this.form,
          tags: Array.isArray(this.form.tags) ? this.form.tags : []
        }
      }
    }))
  }

  handleSubmit(event) {
    event.preventDefault()

    const url = String(this.form.url ?? '').trim()
    if (!url) {
      this.formError = String(t('app.bookmarkUrlRequired'))
      return
    }

    if (this.form.isSearch && !url.includes('%s')) {
      this.formError = String(t('app.bookmarkSearchRequiresPlaceholder'))
      return
    }

    this.emitSave()
  }

  render() {
    if (!this.isOpen) return html``

    return html`
      <div class="dialog-backdrop" @click=${this.closeDialog}>
        <div class="dialog" role="dialog" aria-modal="true" @click=${(event) => event.stopPropagation()}>
          <div class="dialog-header">
            <h2>${this.mode === 'edit' ? t('bookmark.editBookmark') : t('bookmark.addBookmark')}</h2>
            <button type="button" class="close-button" @click=${this.closeDialog} aria-label=${t('bookmark.closeDialog')}>×</button>
          </div>

          <form class="bookmark-form" @submit=${this.handleSubmit}>
            <label class="field">
              <span>${t('bookmark.url')}</span>
              <input
                type="text"
                .value=${this.form.url}
                placeholder="https://example.com/search?q=%s"
                @input=${(event) => {
                  this.form = { ...this.form, url: event.target.value }
                }}
                @blur=${this.handleUrlBlur}
                required
              />
            </label>

            <label class="field checkbox-field">
              <span>${t('bookmark.behavior')}</span>
              <label class="switch-row">
                <input
                  type="checkbox"
                  .checked=${Boolean(this.form.isSearch)}
                  @change=${(event) => {
                    this.form = { ...this.form, isSearch: event.target.checked }
                  }}
                />
                <span>${t('bookmark.searchMode')}</span>
              </label>
            </label>

            ${this.form.isSearch ? html`<p class="search-note">${t('bookmark.searchNote')}</p>` : ''}

            <div class="field-row">
              <label class="field">
                <span>${t('bookmark.title')}</span>
                <input
                  type="text"
                  .value=${this.form.title}
                  @input=${(event) => {
                    this.form = { ...this.form, title: event.target.value }
                  }}
                  placeholder="Bookmark title"
                />
              </label>

              <label class="field">
                <span>${t('bookmark.iconUrl')}</span>
                <div class="icon-url-row">
                  <input
                    type="text"
                    .value=${this.form.icon}
                    @input=${(event) => {
                      this.form = { ...this.form, icon: event.target.value }
                    }}
                    placeholder="https://cdn.example.com/icon.png"
                  />
                  <button type="button" class="secondary-button tiny-button" @click=${this.convertIconToDataUrl}>${t('bookmark.toDataUrl')}</button>
                </div>
              </label>
            </div>

            <label class="field">
              <span>${t('bookmark.description')}</span>
              <textarea
                .value=${this.form.description}
                rows="3"
                @input=${(event) => {
                  this.form = { ...this.form, description: event.target.value }
                }}
                placeholder=${t('bookmark.optionalDescription')}
              ></textarea>
            </label>

            <div class="field">
              <span>${t('bookmark.colors')}</span>
              <div class="color-row">
                <label class="color-picker-field">
                  <span>${t('bookmark.background')}</span>
                  <input
                    type="color"
                    .value=${this.form.background || '#ecfeff'}
                    @input=${(event) => {
                      this.form = { ...this.form, background: event.target.value }
                    }}
                  />
                </label>

                <label class="color-picker-field">
                  <span>${t('bookmark.border')}</span>
                  <input
                    type="color"
                    .value=${this.form.borderColor || '#06b6d4'}
                    @input=${(event) => {
                      this.form = { ...this.form, borderColor: event.target.value }
                    }}
                  />
                </label>

                <label class="color-picker-field">
                  <span>${t('bookmark.text')}</span>
                  <input
                    type="color"
                    .value=${this.form.foregroundColor || '#111827'}
                    @input=${(event) => {
                      this.form = { ...this.form, foregroundColor: event.target.value }
                    }}
                  />
                </label>
              </div>

              <div class="dialog-preview" style=${this.getDialogPreviewStyle()}>
                <img class="dialog-preview-icon" src="${this.form.icon}" />
                <div class="dialog-preview-copy">
                  <strong>${this.form.title || t('bookmark.noTitle')}</strong>
                  <small>${this.form.url || 'https://example.com'}</small>
                </div>
              </div>
            </div>

            <div class="field">
              <span>${t('widget.tags')}</span>
              <div class="tag-picker">
                ${(this.allTags ?? []).map((tag) => html`
                  <button
                    type="button"
                    class=${this.selectedTags.includes(tag) ? 'tag-choice selected' : 'tag-choice'}
                    @click=${() => this.toggleFormTag(tag)}
                  >
                    :${tag}
                  </button>
                `)}
              </div>
              <div class="tag-input-row">
                <input
                  type="text"
                  .value=${this.formTagInput}
                  @input=${(event) => {
                    this.formTagInput = event.target.value
                  }}
                  @keydown=${(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      this.addFormTag()
                    }
                  }}
                  placeholder=${t('bookmark.addNewTag')}
                />
                <button type="button" class="secondary-button" @click=${() => this.addFormTag()}>${t('bookmark.add')}</button>
              </div>
            </div>

            ${this.formError ? html`<p class="form-error">${this.formError}</p>` : ''}

            <div class="dialog-actions">
              <button type="button" class="secondary-button" @click=${this.closeDialog}>${t('bookmark.cancel')}</button>
              <button type="submit" class="primary-button">${this.mode === 'edit' ? t('bookmark.saveChanges') : t('bookmark.createBookmark')}</button>
            </div>
          </form>
        </div>
      </div>
    `
  }

  static get styles() {
    return css`
      :host {
        --editor-bg: var(--dialog-bg, #ffffff);
        --editor-surface: var(--dialog-surface, #ffffff);
        --editor-text: var(--dialog-text, #1f2937);
        --editor-muted: var(--dialog-muted, #475569);
        --editor-border: var(--dialog-border, #dfe7f1);
        --editor-accent: var(--accent, #2563eb);
        --editor-accent-text: var(--accent-text, #ffffff);
        --editor-backdrop: var(--backdrop, rgba(15, 23, 42, 0.42));
        --editor-field-bg: var(--field-bg, rgba(255,255,255,0.75));
        --editor-field-text: var(--field-text, #1f2937);
        --editor-danger: var(--danger, #b91c1c);
        --editor-danger-bg: var(--danger-bg, #fee2e2);
      }

      .dialog-backdrop {
        position: fixed;
        inset: 0;
        background: var(--editor-backdrop);
        display: grid;
        place-items: center;
        padding: 20px;
        z-index: 20;
      }

      .dialog {
        width: min(760px, 100%);
        max-height: 90vh;
        overflow: auto;
        background: var(--editor-bg);
        border-radius: 20px;
        box-shadow: 0 24px 50px rgba(15, 23, 42, 0.18);
        border: 1px solid var(--editor-border);
        color: var(--editor-text);
      }

      .dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 22px 12px;
        border-bottom: 1px solid color-mix(in srgb, var(--editor-border) 80%, transparent);
      }

      .dialog-header h2 {
        margin: 0;
        font-size: 1.35rem;
        color: var(--editor-text);
      }

      .close-button {
        width: 32px;
        height: 32px;
        border-radius: 999px;
        border: 1px solid var(--editor-border);
        background: transparent;
        font-size: 1.3rem;
        cursor: pointer;
        color: var(--editor-text);
      }

      .bookmark-form {
        display: grid;
        gap: 18px;
        padding: 22px;
      }

      .field {
        display: grid;
        gap: 8px;
        color: var(--editor-text);
        font-weight: 600;
      }

      .field span {
        color: var(--editor-muted);
      }

      .checkbox-field {
        gap: 6px;
      }

      .switch-row {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 600;
        color: var(--editor-text);
      }

      .switch-row input {
        width: 16px;
        height: 16px;
      }

      .search-note {
        margin: -4px 0 0;
        color: var(--editor-muted);
        font-size: 0.85rem;
        line-height: 1.4;
      }

      .field input,
      .field textarea,
      .tag-input-row input {
        width: 100%;
        border: 1px solid var(--editor-border);
        border-radius: 12px;
        background: var(--editor-field-bg);
        padding: 11px 12px;
        font: inherit;
        color: var(--editor-field-text);
        box-sizing: border-box;
      }
      
      .field input[type="checkbox"] {
        flex: 0;
      }

      .field-row {
        display: grid;
        grid-template-columns: 1.2fr 1fr;
        gap: 14px;
      }

      .icon-url-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .icon-url-row input {
        flex: 1 1 auto;
      }

      .tiny-button {
        flex-shrink: 0;
        white-space: nowrap;
        padding: 10px 12px;
      }

      .color-row {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
      }

      .color-picker-field {
        display: grid;
        gap: 8px;
        color: var(--editor-muted);
        font-weight: 600;
      }

      .color-picker-field input {
        width: 100%;
        height: 48px;
        min-width: 0;
        border: 1px solid var(--editor-border);
        border-radius: 12px;
        background: var(--editor-surface);
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
        border: 1px solid var(--editor-border);
        background: var(--chip-bg, #eef2ff);
        color: var(--chip-text, #1f2937);
        border-radius: 999px;
        padding: 7px 12px;
        font-size: 0.76rem;
        font-weight: 700;
        cursor: pointer;
      }

      .tag-choice.selected {
        background: var(--editor-accent);
        color: var(--editor-accent-text);
        border-color: var(--editor-accent);
      }

      .tag-input-row {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }

      .secondary-button,
      .primary-button {
        border-radius: 12px;
        border: 1px solid var(--editor-border);
        padding: 11px 14px;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }

      .secondary-button {
        background: var(--editor-surface);
        color: var(--editor-text);
      }

      .primary-button {
        background: var(--editor-accent);
        border-color: var(--editor-accent);
        color: var(--editor-accent-text);
      }

      .form-error {
        margin: 0;
        color: var(--editor-danger);
        font-weight: 600;
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 4px;
      }
    `
  }
}

customElements.define('zalozky-link-editor', ZalozkyLinkEditor)
