import { LitElement, css, html } from 'lit'
import { t } from './i18n'

export class ZalozkyLink extends LitElement {
  declare url: string
  declare title: string
  declare description: string
  declare icon: string
  declare tags: string[]
  declare background: string
  declare borderColor: string
  declare foregroundColor: string
  declare source: string
  declare isSearch: boolean
  declare expanded: boolean
  declare locale: string
  searchValue = ''

  static get properties() {
    return {
      url: { type: String, attribute: 'url' },
      title: { type: String, attribute: 'title' },
      description: { type: String, attribute: 'description' },
      icon: { type: String, attribute: 'icon' },
      tags: { type: Array, attribute: 'tags' },
      background: { type: String, attribute: 'background' },
      borderColor: { type: String, attribute: 'border-color' },
      foregroundColor: { type: String, attribute: 'foreground-color' },
      source: { type: String, attribute: 'source' },
      isSearch: { type: Boolean, attribute: 'is-search', reflect: true },
      expanded: { type: Boolean, attribute: 'expanded', reflect: true },
      locale: { type: String }
    }
  }

  constructor() {
    super()
    this.url = ''
    this.title = ''
    this.description = ''
    this.icon = '🔗'
    this.tags = []
    this.background = '#ecfeff'
    this.borderColor = '#06b6d4'
    this.foregroundColor = '#111827'
    this.source = 'local'
    this.isSearch = false
    this.expanded = false
    this.locale = 'en'
    this.searchValue = ''
  }

  connectedCallback() {
    super.connectedCallback()
    if (!this.tags?.length && this.getAttribute('tags')) {
      this.tags = this.getAttribute('tags')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    }
  }

  get resolvedUrl() {
    return String(this.url ?? '').trim()
  }

  get resolvedIcon() {
    return String(this.icon ?? '').trim() || '🔗'
  }

  get iconIsImageUrl() {
    return /^(https?:)?\/\//i.test(this.resolvedIcon)
      || /^data:image\//i.test(this.resolvedIcon)
      || /^blob:/i.test(this.resolvedIcon)
  }

  get tagList() {
    return Array.isArray(this.tags) ? this.tags : []
  }

  emitEdit() {
    this.dispatchEvent(new CustomEvent('edit-request', { bubbles: true, composed: true }))
  }

  emitExpand() {
    this.dispatchEvent(new CustomEvent('toggle-expand', { bubbles: true, composed: true }))
  }

  emitDelete() {
    this.dispatchEvent(new CustomEvent('delete-request', { bubbles: true, composed: true }))
  }

  emitUse() {
    this.dispatchEvent(new CustomEvent('bookmark-use', { bubbles: true, composed: true }))
  }

  openContextMenu(event) {
    event?.preventDefault?.()
    event?.stopPropagation?.()

    const menu = this.shadowRoot?.querySelector('.bookmark-menu')
    const allMenus = this.shadowRoot?.querySelectorAll('.bookmark-menu') ?? []
    allMenus.forEach((item) => item.classList.remove('open'))
    menu?.classList.add('open')
  }

  handleSearchSubmit(event) {
    event.preventDefault()

    const query = String(this.searchValue ?? '').trim()
    if (!this.resolvedUrl) return

    const targetUrl = this.resolvedUrl.includes('%s')
      ? this.resolvedUrl.replace(/%s/gi, encodeURIComponent(query))
      : this.resolvedUrl

    if (!targetUrl) return
    this.emitUse()

    const activeWindow = typeof window !== 'undefined' ? window : globalThis
    if (activeWindow?.location?.assign) {
      activeWindow.location.assign(targetUrl)
    }
  }

  render() {
    const expanded = Boolean(this.expanded)
    const bookmarkUrl = this.resolvedUrl
    const fgColor = this.foregroundColor || '#111827'

    return html`
      <article
        class=${expanded ? 'bookmark-card expanded' : 'bookmark-card'}
        style="background:${this.background}; border-color:${this.borderColor}; color:${fgColor};"
        @contextmenu=${this.openContextMenu}
      >
        <div class="bookmark-menu" role="menu" aria-label="Bookmark actions">
          <button
            type="button"
            class="menu-item"
            role="menuitem"
            @click=${(event) => {
              event.preventDefault()
              event.stopPropagation()
              this.emitExpand()
              this.shadowRoot?.querySelector('.bookmark-menu')?.classList.remove('open')
            }}
          >
            <span class="material-symbols" aria-hidden="true">qr_code_2</span>
            <span>${t('bookmark.qrCode')}</span>
          </button>

          <button
            type="button"
            class="menu-item"
            role="menuitem"
            @click=${(event) => {
              event.preventDefault()
              event.stopPropagation()
              this.emitEdit()
              this.shadowRoot?.querySelector('.bookmark-menu')?.classList.remove('open')
            }}
          >
            <span class="material-symbols" aria-hidden="true">edit</span>
            <span>${t('bookmark.edit')}</span>
          </button>

          <button
            type="button"
            class="menu-item danger"
            role="menuitem"
            @click=${(event) => {
              event.preventDefault()
              event.stopPropagation()
              this.emitDelete()
              this.shadowRoot?.querySelector('.bookmark-menu')?.classList.remove('open')
            }}
          >
            <span class="material-symbols" aria-hidden="true">delete</span>
            <span>${t('bookmark.remove')}</span>
          </button>
        </div>

        <div class="bookmark-body">
          <a
            class="bookmark-link"
            href=${this.isSearch ? undefined : bookmarkUrl}
            target=${this.isSearch ? undefined : '_self'}
            rel=${this.isSearch ? undefined : 'noreferrer noopener'}
            @click=${(event) => {
              if (this.isSearch) {
                event.preventDefault()
                event.stopPropagation()
                return
              }
              this.emitUse()
            }}
            @auxclick=${(event) => {
              if (this.isSearch) {
                event.preventDefault()
                return
              }
              if (event.button === 1) {
                this.emitUse()
              }
            }}
          >
            <div class="bookmark-top">
              <div class="bookmark-icon" aria-hidden="true">
                ${typeof this.resolvedIcon === 'string' && this.iconIsImageUrl
                  ? html`<img src=${this.resolvedIcon} alt="" />`
                  : html`${this.resolvedIcon}`}
              </div>
              <div class="bookmark-meta">
                <h3 style="color: ${fgColor};">${this.title}</h3>
                <span style="color: ${fgColor};">${bookmarkUrl}</span>
              </div>
            </div>

            ${this.isSearch
              ? html`
                <form class="search-box" @submit=${this.handleSearchSubmit}>
                  <input
                    type="search"
                    class="search-input"
                    .value=${this.searchValue}
                    @input=${(event) => {
                      this.searchValue = event.target.value
                    }}
                    placeholder=${this.title || t('bookmark.search')}
                    aria-label=${t('bookmark.search')}
                  />
                  <button
                    type="submit"
                    class="search-button"
                    aria-label="Search"
                    @click=${(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      this.handleSearchSubmit(event)
                    }}
                  >
                    <span class="material-symbols" aria-hidden="true">search</span>
                  </button>
                </form>
              `
              : this.description
                ? html`<p class="description" style="color: ${fgColor};">${this.description}</p>`
                : ''}

            <div class="tag-list">
              ${this.tagList.map((tag) => html`<span class="tag">:${tag}</span>`)}
            </div>
          </a>

          ${expanded ? html`
            <div class="bookmark-detail">
              <div class="qr-wrap">
                <img
                  src=${`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(bookmarkUrl)}`}
                  alt="QR code for ${this.title}"
                />
              </div>
            </div>
          ` : ''}
        </div>
      </article>
    `
  }

  static get styles() {
    return css`
      :host {
        --bookmark-card-bg: var(--panel-strong, #ffffff);
        --bookmark-card-text: var(--ink, #111827);
        --bookmark-card-border: var(--border, rgba(17,24,39,0.12));
        --bookmark-card-muted: var(--muted, rgba(17,24,39,0.7));
        --bookmark-card-chip: rgba(255,255,255,0.5);
        --bookmark-card-shadow: var(--shadow, rgba(31,41,55,0.12));
        display: block;
      }

      :host([expanded]),
      :host(.expanded) {}

      * {
        box-sizing: border-box;
      }

      .bookmark-card {
        display: flex;
        flex-direction: column;
        gap: 8px;
        height: 12rem;
        padding: 14px 16px;
        border-radius: 16px;
        border: 2px solid;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.12);
        color: var(--bookmark-card-text);
        transition: transform 150ms ease, box-shadow 150ms ease;
        position: relative;
        overflow: hidden;
        
      }

      .bookmark-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 22px var(--bookmark-card-shadow);
      }

      .bookmark-menu {
        position: absolute;
        top: 12px;
        right: 12px;
        min-width: 150px;
        display: none;
        flex-direction: column;
        gap: 6px;
        padding: 8px;
        border-radius: 12px;
        border: 1px solid var(--bookmark-card-border);
        background: color-mix(in srgb, var(--panel-strong, #ffffff) 94%, transparent);
        box-shadow: 0 10px 22px rgba(15, 23, 42, 0.12);
        z-index: 5;
      }

      .bookmark-menu.open {
        display: flex;
      }

      .menu-item {
        appearance: none;
        background: rgba(148, 163, 184, 0.08);
        border: none;
        border-radius: 10px;
        padding: 9px 10px;
        text-align: left;
        font: inherit;
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--bookmark-card-text, #111827);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 2px 7px rgba(15, 23, 42, 0.06);
        transition: background 140ms ease, transform 140ms ease, box-shadow 140ms ease;
      }

      .menu-item:hover {
        background: rgba(37, 99, 235, 0.08);
        box-shadow: 0 8px 16px rgba(15, 23, 42, 0.1);
        transform: translateY(-1px);
      }

      .menu-item.danger {
        color: var(--delete-text, #b91c1c);
        background: rgba(239, 68, 68, 0.08);
      }

      .material-symbols {
        font-family: 'Material Symbols Rounded', 'Segoe UI Symbol', sans-serif;
        font-weight: normal;
        font-style: normal;
        font-size: 18px;
        line-height: 1;
        letter-spacing: normal;
        text-transform: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        -webkit-font-smoothing: antialiased;
      }

      .bookmark-body {
        display: flex;
        flex-direction: row;
        align-items: stretch;
        gap: 16px;
        flex: 1;
        min-height: 0;
      }

      .bookmark-link {
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex: 1 1 0;
        min-width: 0;
        min-height: 0;
        color: inherit;
        text-decoration: none;
      }

      .bookmark-top {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
        min-width: 0;
      }

      .bookmark-icon {
        width: 42px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        background: rgba(255,255,255,0.18);
        font-size: 1.5rem;
        line-height: 1;
        overflow: hidden;
        flex-shrink: 0;
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
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .bookmark-meta h3 {
        margin: 0 0 2px;
        font-size: 1.05rem;
        line-height: 1.25;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .bookmark-meta span {
        display: block;
        font-size: 0.7rem;
        line-height: 1.4;
        color: inherit;
        opacity: 0.74;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .description {
        margin: 0;
        color: inherit;
        opacity: 0.82;
        font-size: 0.86rem;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .search-box {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 2px;
      }

      .search-input {
        flex: 1 1 auto;
        min-width: 0;
        border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
        border-radius: 8px;
        background: rgba(255,255,255,0.9);
        color: #333;
        padding: 6px 6px;
        font: inherit;
        font-size: smaller;
      }

      .search-button {
        border: 1px solid color-mix(in srgb, currentColor 24%, transparent);
        border-radius: 8px;
        background: rgba(255,255,255,0.2);
        color: inherit;
        font: inherit;
        font-size: smaller;
        font-weight: 700;
        padding: 4px 8px;
        cursor: pointer;
      }

      .tag-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: auto;
        overflow: hidden;
        max-height: 26px;
      }

      .tag {
        display: inline-flex;
        align-items: center;
        background: rgba(255,255,255,0.18);
        border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
        color: inherit;
        border-radius: 999px;
        padding: 3px 8px;
        font-size: 0.68rem;
        font-weight: 700;
      }

      .bookmark-detail {
        display: flex;
        align-items: center;
        justify-content: center;
        padding-left: 16px;
        border-left: 1px solid color-mix(in srgb, currentColor 16%, transparent);
        flex-shrink: 0;
      }

      .qr-wrap {
        height: 100%;
        max-height: 138px;
        aspect-ratio: 1;
        padding: 8px;
        border-radius: 12px;
        background: rgba(255,255,255,0.12);
        box-shadow: 0 6px 14px rgba(15,23,42,0.08);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .qr-wrap img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      @media (max-width: 560px) {
        :host([expanded]),
        :host(.expanded) {
          grid-column: span 1;
        }
      }
    `
  }
}

customElements.define('zalozky-link', ZalozkyLink)