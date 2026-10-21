import { LitElement, css, html } from 'lit'
import './html-fragment-editor'
import { t } from './i18n'

export class ZalozkyWidgetEditor extends LitElement {
  declare isOpen: boolean
  declare mode: string
  declare widget: Record<string, any>
  declare allTags: string[]
  declare form: Record<string, any>
  declare formTagInput: string
  declare formError: string
  declare locale: string
  editorView: any = null

  static get properties() {
    return {
      isOpen: { type: Boolean, attribute: 'open' },
      mode: { type: String },
      widget: { type: Object },
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
    this.widget = this.emptyWidgetForm()
    this.allTags = []
    this.form = this.emptyWidgetForm()
    this.formTagInput = ''
    this.formError = ''
    this.editorView = null
    this.locale = 'en'
  }

  connectedCallback() {
    super.connectedCallback()
    this.syncFormFromWidget()
  }

  updated(changedProperties) {
    super.updated(changedProperties)

    if (changedProperties.has('widget')) {
      this.syncFormFromWidget()
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
      source: 'local'
    }
  }

  syncFormFromWidget() {
    const nextWidget = this.widget && Object.keys(this.widget).length
      ? {
          ...this.emptyWidgetForm(),
          ...this.widget,
          background: this.widget.background ?? '#ecfeff',
          borderColor: this.widget.borderColor ?? '#06b6d4',
          foregroundColor: this.widget.foregroundColor ?? '#111827',
          url: this.widget.url ?? '',
          tags: Array.isArray(this.widget.tags) ? [...this.widget.tags] : []
        }
      : this.emptyWidgetForm()

    this.form = nextWidget
    this.formTagInput = ''
    this.formError = ''
  }

  getDialogPreviewStyle() {
    const background = this.form?.background || '#ecfeff'
    const borderColor = this.form?.borderColor || '#06b6d4'
    const foregroundColor = this.form?.foregroundColor || '#111827'
    return `background:${background}; border:2px solid ${borderColor}; color:${foregroundColor};`
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
    this.form = { ...this.form, tags: nextTags }

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

  closeDialog() {
    this.dispatchEvent(new CustomEvent('close-editor', { bubbles: true, composed: true }))
  }

  emitSave() {
    this.dispatchEvent(new CustomEvent('save-widget', {
      bubbles: true,
      composed: true,
      detail: {
        mode: this.mode,
        widget: {
          ...this.form,
          tags: Array.isArray(this.form.tags) ? this.form.tags : []
        }
      }
    }))
  }

  handleHtmlFragmentChange(event) {
    const nextHtml = event.detail?.value ?? ''
    if (this.form.html !== nextHtml) {
      this.form = { ...this.form, html: nextHtml }
    }
  }

  handleSubmit(event) {
    event.preventDefault()

    const title = String(this.form.title ?? '').trim()
    if (!title) {
      this.formError = String(t('app.widgetTitleRequired'))
      return
    }

    const html = String(this.form.html ?? '').trim()
    if (!html) {
      this.formError = String(t('app.widgetHtmlRequired'))
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
            <h2>${this.mode === 'edit' ? t('widget.editWidget') : t('widget.addWidget')}</h2>
            <button type="button" class="close-button" @click=${this.closeDialog} aria-label=${t('widget.closeDialog')}>×</button>
          </div>

          <form class="widget-form" @submit=${this.handleSubmit}>
            <label class="field">
              <span>${t('widget.title')}</span>
              <input
                type="text"
                .value=${this.form.title}
                @input=${(event) => {
                  this.form = { ...this.form, title: event.target.value }
                }}
                placeholder=${t('widget.widgetTitlePlaceholder')}
                required
              />
            </label>

            <label class="field">
              <span>${t('widget.linkUrlOptional')}</span>
              <input
                type="url"
                .value=${this.form.url ?? ''}
                @input=${(event) => {
                  this.form = { ...this.form, url: event.target.value }
                }}
                placeholder=${t('widget.urlPlaceholder')}
              />
            </label>

            <div class="field">
              <span>${t('widget.colors')}</span>
              <div class="color-row">
                <label class="color-picker-field">
                  <span>${t('widget.background')}</span>
                  <input
                    type="color"
                    .value=${this.form.background || '#ecfeff'}
                    @input=${(event) => {
                      this.form = { ...this.form, background: event.target.value }
                    }}
                  />
                </label>

                <label class="color-picker-field">
                  <span>${t('widget.border')}</span>
                  <input
                    type="color"
                    .value=${this.form.borderColor || '#06b6d4'}
                    @input=${(event) => {
                      this.form = { ...this.form, borderColor: event.target.value }
                    }}
                  />
                </label>

                <label class="color-picker-field">
                  <span>${t('widget.text')}</span>
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
                <div class="dialog-preview-copy">
                  <strong>${this.form.title || t('widget.emptyTitle')}</strong>
                  <small>${this.form.url || 'https://example.com'}</small>
                </div>
              </div>
            </div>

            <label class="field">
              <span>${t('widget.htmlFragment')}</span>
              <html-fragment-editor
                .value=${this.form.html ?? ''}
                @value-change=${this.handleHtmlFragmentChange}
              ></html-fragment-editor>
            </label>

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
                  placeholder=${t('widget.addNewTag')}
                />
                <button type="button" class="secondary-button" @click=${() => this.addFormTag()}>${t('widget.add')}</button>
              </div>
            </div>

            ${this.formError ? html`<p class="form-error">${this.formError}</p>` : ''}

            <div class="dialog-actions">
              <button type="button" class="secondary-button" @click=${this.closeDialog}>${t('widget.cancel')}</button>
              <button type="submit" class="primary-button">${this.mode === 'edit' ? t('widget.saveChanges') : t('widget.createWidget')}</button>
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

      .widget-form {
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
        max-width: 700px;
        overflow: clip;
        box-sizing: border-box;
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
        border-radius: 999px;
        background: transparent;
        color: var(--editor-text);
        padding: 7px 10px;
        cursor: pointer;
        font: inherit;
      }

      .tag-choice.selected {
        background: color-mix(in srgb, var(--editor-accent) 14%, transparent);
        border-color: color-mix(in srgb, var(--editor-accent) 60%, var(--editor-border));
        color: var(--editor-accent);
      }

      .tag-input-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .tag-input-row input {
        flex: 1;
      }

      .secondary-button,
      .primary-button {
        border-radius: 12px;
        border: 1px solid var(--editor-border);
        padding: 10px 14px;
        cursor: pointer;
        font: inherit;
        font-weight: 700;
      }

      .secondary-button {
        background: transparent;
        color: var(--editor-text);
      }

      .primary-button {
        background: var(--editor-accent);
        border-color: var(--editor-accent);
        color: var(--editor-accent-text);
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding-top: 8px;
      }

      .form-error {
        margin: 0;
        color: var(--editor-danger);
        background: var(--editor-danger-bg);
        border-radius: 10px;
        padding: 10px 12px;
      }
    `
  }
}

customElements.define('zalozky-widget-editor', ZalozkyWidgetEditor)
