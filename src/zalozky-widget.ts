import { LitElement, css, html } from 'lit'
import { t } from './i18n'

export class ZalozkyWidget extends LitElement {
  declare title: string
  declare url: string
  declare html: string
  declare tags: string[]
  declare background: string
  declare borderColor: string
  declare foregroundColor: string
  declare source: string
  declare expanded: boolean
  declare locale: string

  static get properties() {
    return {
      title: { type: String, attribute: 'title' },
      url: { type: String, attribute: 'url' },
      html: { type: String, attribute: 'html' },
      tags: { type: Array, attribute: 'tags' },
      background: { type: String, attribute: 'background' },
      borderColor: { type: String, attribute: 'border-color' },
      foregroundColor: { type: String, attribute: 'foreground-color' },
      source: { type: String, attribute: 'source' },
      expanded: { type: Boolean, attribute: 'expanded', reflect: true },
      locale: { type: String }
    }
  }

  constructor() {
    super()
    this.title = ''
    this.url = ''
    this.html = ''
    this.tags = []
    this.background = '#ecfeff'
    this.borderColor = '#06b6d4'
    this.foregroundColor = '#111827'
    this.source = 'local'
    this.expanded = false
    this.locale = 'en'
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

  updated(changedProperties) {
    super.updated(changedProperties)
    if (changedProperties.has('html')) {
      this.renderWidgetHtml()
    }
  }

  renderWidgetHtml() {
    const host = this.shadowRoot?.querySelector('.widget-content')
    if (!host) return

    const safeHtml = String(this.html ?? '')
    host.innerHTML = ''

    if (!safeHtml.trim()) {
      host.innerHTML = '<p class="widget-empty">Widget content</p>'
      return
    }

    const wrapper = document.createElement('div')
    wrapper.innerHTML = safeHtml
    host.appendChild(wrapper)

    const shadowRoot = host.getRootNode?.() ?? host.ownerDocument ?? document
    const safeWindow = typeof window !== 'undefined' ? window : globalThis
    const safeDocument = shadowRoot?.ownerDocument || document
    const scripts = Array.from(wrapper.querySelectorAll('script'))
    scripts.forEach((script) => {
      const scriptSource = String(script.textContent ?? '').trim()
      if (!scriptSource) {
        script.remove?.()
        return
      }

      try {
        const execute = new Function('shadowRoot', 'window', 'document', scriptSource)
        execute(shadowRoot, safeWindow, safeDocument)
      } catch (error) {
        console.error('Widget script execution failed', error)
      }

      script.remove?.()
    })
  }

  get tagList() {
    return Array.isArray(this.tags) ? this.tags : []
  }

  emitEdit() {
    this.dispatchEvent(new CustomEvent('edit-request', { bubbles: true, composed: true }))
  }

  emitDelete() {
    this.dispatchEvent(new CustomEvent('delete-request', { bubbles: true, composed: true }))
  }

  openContextMenu(event) {
    event?.preventDefault?.()
    event?.stopPropagation?.()

    const menu = this.shadowRoot?.querySelector('.widget-menu')
    const allMenus = this.shadowRoot?.querySelectorAll('.widget-menu') ?? []
    allMenus.forEach((item) => item.classList.remove('open'))
    menu?.classList.add('open')
  }

  handleCardClick(event) {
    const targetUrl = String(this.url ?? '').trim()
    if (!targetUrl) return

    const clickTarget = event?.target
    if (clickTarget && clickTarget.closest && clickTarget.closest('button, input, textarea, select, a')) {
      return
    }

    event?.preventDefault?.()
    event?.stopPropagation?.()

    const activeWindow = typeof window !== 'undefined' ? window : globalThis
    if (activeWindow?.location?.assign) {
      activeWindow.location.assign(targetUrl)
    }
  }

  render() {
    const fgColor = this.foregroundColor || '#111827'

    return html`
      <article
        class="widget-card"
        style="background:${this.background || '#ecfeff'}; border-color:${this.borderColor || '#06b6d4'}; color:${fgColor};"
        @click=${this.handleCardClick}
        @contextmenu=${this.openContextMenu}
      >
        <div class="widget-menu" role="menu" aria-label="Widget actions">
          <button
            type="button"
            class="menu-item"
            role="menuitem"
            @click=${(event) => {
              event.preventDefault()
              event.stopPropagation()
              this.emitEdit()
              this.shadowRoot?.querySelector('.widget-menu')?.classList.remove('open')
            }}
          >
            <span class="material-symbols" aria-hidden="true">edit</span>
            <span>${t('widget.edit')}</span>
          </button>

          <button
            type="button"
            class="menu-item danger"
            role="menuitem"
            @click=${(event) => {
              event.preventDefault()
              event.stopPropagation()
              this.emitDelete()
              this.shadowRoot?.querySelector('.widget-menu')?.classList.remove('open')
            }}
          >
            <span class="material-symbols" aria-hidden="true">delete</span>
            <span>${t('widget.remove')}</span>
          </button>
        </div>

        <div class="widget-body">


          <div class="widget-content" aria-live="polite"></div>

          ${this.tagList.length ? html`
            <div class="tag-list">
              ${this.tagList.map((tag) => html`<span class="tag">:${tag}</span>`)}
            </div>
          ` : ''}
        </div>
      </article>
    `
  }

  static get styles() {
    return css`
      :host {
        --widget-card-bg: var(--panel-strong, #ffffff);
        --widget-card-text: var(--ink, #111827);
        --widget-card-border: var(--border, rgba(17, 24, 39, 0.12));
        --widget-card-muted: var(--muted, rgba(17, 24, 39, 0.7));
        --widget-card-chip: rgba(255, 255, 255, 0.5);
        --widget-card-shadow: var(--shadow, rgba(31, 41, 55, 0.12));
        display: block;
      }

      * { box-sizing: border-box; }

      .widget-card {
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-height: 190px;
        padding: 14px 16px;
        border-radius: 16px;
        border: 2px solid;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.12);
        color: var(--widget-card-text);
        transition: transform 150ms ease, box-shadow 150ms ease;
        overflow: hidden;
      }

      .widget-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 22px var(--widget-card-shadow);
      }

      .widget-menu {
        position: absolute;
        right: 12px;
        top: 12px;
        min-width: 150px;
        background: rgba(255,255,255,0.94);
        border: 1px solid rgba(17, 24, 39, 0.08);
        border-radius: 12px;
        box-shadow: 0 14px 30px rgba(15, 23, 42, 0.12);
        padding: 8px;
        display: none;
        z-index: 6;
      }

      .widget-menu.open {
        display: grid;
      }

      .menu-item {
        border: none;
        background: transparent;
        color: #111827;
        padding: 8px 10px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        text-align: left;
        font: inherit;
      }

      .menu-item:hover { background: rgba(148, 163, 184, 0.12); }
      .menu-item.danger { color: #b91c1c; }

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

      .widget-body {
        display: flex;
        flex-direction: column;
        gap: 12px;
        flex: 1;
      }

      .widget-header {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .widget-pill {
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        opacity: 0.7;
      }

      .widget-header h3 {
        margin: 0;
        font-size: 1.05rem;
        line-height: 1.3;
      }

      .widget-content {
        flex: 1;
        min-height: 3rem;
        overflow: hidden;
        font-size: 0.92rem;
        line-height: 1.45;
      }

      .widget-content > * {
        max-width: 100%;
      }

      .widget-content img,
      .widget-content iframe,
      .widget-content video,
      .widget-content svg {
        max-width: 100%;
        display: block;
      }

      .widget-empty {
        margin: 0;
        color: inherit;
        opacity: 0.7;
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
        padding: 4px 8px;
        border-radius: 999px;
        font-size: 0.7rem;
        font-weight: 700;
        background: rgba(255,255,255,0.38);
        border: 1px solid rgba(17, 24, 39, 0.08);
      }
    `
  }
}

customElements.define('zalozky-widget', ZalozkyWidget)
