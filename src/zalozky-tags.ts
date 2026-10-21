import { LitElement, css, html } from 'lit'
import { t } from './i18n'

export class ZalozkyTags extends LitElement {
  declare tags: string[]
  declare selectedTags: string[]
  declare filterText: string
  declare locale: string
  _tagPressTimer: number | null = null

  static get properties() {
    return {
      tags: { type: Array },
      selectedTags: { type: Array },
      filterText: { type: String, attribute: 'filter-text' },
      locale: { type: String }
    }
  }

  constructor() {
    super()
    this.tags = []
    this.selectedTags = []
    this.filterText = ''
    this.locale = 'en'
    this._tagPressTimer = null
  }

  get visibleTags() {
    const query = String(this.filterText ?? '').trim().toLowerCase()
    return [...(this.tags ?? [])]
      .filter((tag) => !query || String(tag).toLowerCase().includes(query))
      .sort()
  }

  emitTagFilter(value) {
    this.dispatchEvent(new CustomEvent('tag-filter-change', {
      detail: { value },
      bubbles: true,
      composed: true
    }))
  }

  emitTagToggle(tag, cumulative = false) {
    this.dispatchEvent(new CustomEvent('tag-toggle', {
      detail: { tag, cumulative },
      bubbles: true,
      composed: true
    }))
  }

  handleFilterInput(event) {
    const value = String(event.target.value ?? '')
    this.filterText = value
    this.emitTagFilter(value)
  }

  handleTagClick(event, tag) {
    const cumulative = Boolean(event.ctrlKey || event.metaKey)
    this.emitTagToggle(tag, cumulative)
  }

  handlePointerDown(event, tag) {
    if (event.pointerType === 'touch' || event.pointerType === 'pen') {
      this._tagPressTimer = window.setTimeout(() => {
        this.emitTagToggle(tag, true)
      }, 450)
    }
  }

  handlePointerUp() {
    if (this._tagPressTimer) {
      clearTimeout(this._tagPressTimer)
      this._tagPressTimer = null
    }
  }

  handlePointerLeave() {
    if (this._tagPressTimer) {
      clearTimeout(this._tagPressTimer)
      this._tagPressTimer = null
    }
  }

  render() {
    const selected = Array.isArray(this.selectedTags) ? this.selectedTags : []

    return html`
      <aside class="tag-panel">
        <div class="panel-header">
          <h2>${t('tags.title')}</h2>
          <input
            type="text"
            class="tag-filter"
            .value=${this.filterText}
            @input=${this.handleFilterInput}
            placeholder=${t('tags.filterPlaceholder')}
          />
        </div>

        <div class="tags">
          ${this.visibleTags.map((tag) => html`
            <button
              type="button"
              class=${selected.includes(tag) ? 'tag-pill selected' : 'tag-pill'}
              @click=${(event) => this.handleTagClick(event, tag)}
              @pointerdown=${(event) => this.handlePointerDown(event, tag)}
              @pointerup=${this.handlePointerUp}
              @pointerleave=${this.handlePointerLeave}
            >
              :${tag}
            </button>
          `)}
        </div>
      </aside>
    `
  }

  static styles = css`
    :host {
      --tag-panel-bg: var(--panel, rgba(255, 255, 255, 0.9));
      --tag-panel-border: var(--border, #dfe7f1);
      --tag-panel-shadow: var(--shadow, rgba(15, 23, 42, 0.08));
      --tag-panel-ink: var(--ink, #1f2937);
      --tag-filter-bg: var(--field-bg, rgba(255,255,255,0.75));
      --tag-filter-text: var(--field-text, #1f2937);
      --tag-chip-bg: var(--chip-bg, #eef2ff);
      --tag-chip-text: var(--chip-text, #1f2937);
      --tag-chip-selected: var(--accent, #2563eb);
      --tag-chip-selected-text: var(--accent-text, #ffffff);
      display: block;
      width: 100%;
    }

    .tag-panel {
      background: var(--tag-panel-bg);
      border: 1px solid var(--tag-panel-border);
      border-radius: 18px;
      box-shadow: 0 14px 30px var(--tag-panel-shadow);
      padding: 18px;
      position: sticky;
      top: 20px;
    }

    .panel-header {
      display: grid;
      gap: 10px;
      margin-bottom: 14px;
    }

    .panel-header h2 {
      margin: 0;
      font-size: 1.1rem;
      color: var(--tag-panel-ink);
    }

    .tag-filter {
      width: 100%;
      border: 1px solid var(--tag-panel-border);
      border-radius: 12px;
      background: var(--tag-filter-bg);
      padding: 12px 14px;
      font: inherit;
      color: var(--tag-filter-text);
      box-sizing: border-box;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .tag-pill {
      border: 1px solid var(--tag-panel-border);
      background: var(--tag-chip-bg);
      color: var(--tag-chip-text);
      border-radius: 999px;
      padding: 7px 12px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: 120ms ease;
    }

    .tag-pill.selected {
      background: var(--tag-chip-selected);
      color: var(--tag-chip-selected-text);
      border-color: var(--tag-chip-selected);
    }
  `
}

customElements.define('zalozky-tags', ZalozkyTags)
