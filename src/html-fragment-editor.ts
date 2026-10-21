import { LitElement, css, html } from 'lit'
import { EditorView, basicSetup } from 'codemirror'
import { html as htmlSupport } from '@codemirror/lang-html'

export class HTMLFragmentEditor extends LitElement {
  declare value: string
  declare disabled: boolean
  editorView: EditorView | null = null

  static get properties() {
    return {
      value: { type: String },
      disabled: { type: Boolean }
    }
  }

  constructor() {
    super()
    this.value = ''
    this.disabled = false
    this.editorView = null
  }

  firstUpdated() {
    this.initCodeEditor()
  }

  updated(changedProperties) {
    super.updated(changedProperties)

    if (this.editorView && changedProperties.has('value')) {
      const nextValue = this.value ?? ''
      const currentValue = this.editorView.state.doc.toString()
      if (currentValue !== nextValue) {
        this.editorView.dispatch({
          changes: {
            from: 0,
            to: this.editorView.state.doc.length,
            insert: nextValue
          }
        })
      }
    }
  }

  initCodeEditor() {
    const host = this.shadowRoot?.querySelector('.code-editor')
    if (!host || this.editorView) {
      if (this.editorView && host && this.editorView.dom.parentNode !== host) {
        this.editorView.destroy()
        this.editorView = null
      }
      if (this.editorView) return
      return
    }

    this.editorView = new EditorView({
      doc: this.value ?? '',
      extensions: [
        basicSetup,
        htmlSupport(),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return
          const nextValue = update.state.doc.toString()
          if (this.value !== nextValue) {
            this.value = nextValue
          }
          this.dispatchEvent(new CustomEvent('value-change', {
            bubbles: true,
            composed: true,
            detail: { value: nextValue }
          }))
        })
      ],
      parent: host
    })
  }

  render() {
    return html`
      <div class="code-editor-shell" aria-label="HTML fragment editor">
        <div class="code-editor" aria-label="HTML fragment editor surface"></div>
      </div>
    `
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }

      .code-editor-shell {
        border: 1px solid var(--dialog-border, #dfe7f1);
        border-radius: 12px;
        background: var(--field-bg, rgba(255,255,255,0.75));
        overflow: hidden;
      }

      .code-editor {
        min-height: 220px;
        max-height: 340px;
        overflow: auto;
        font: 0.9rem/1.5 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      }

      .code-editor .cm-editor {
        min-height: 220px;
        max-height: 340px;
      }

      .code-editor .cm-scroller {
        overflow: auto;
      }
    `
  }
}

customElements.define('html-fragment-editor', HTMLFragmentEditor)
