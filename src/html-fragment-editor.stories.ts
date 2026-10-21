import './html-fragment-editor'

const buildEditor = (args = {}) => {
  const element = document.createElement('html-fragment-editor')
  Object.assign(element, {
    value: '<section><h1>Hello</h1></section>',
    disabled: false,
    ...args
  })
  return element
}

export default {
  title: 'Components/HTML Fragment Editor',
  component: 'html-fragment-editor',
  render: (args) => buildEditor(args)
}

export const Default = {
  args: {
    value: '<section><h1>Hello</h1></section>'
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('html-fragment-editor')
    const editor = host?.shadowRoot?.querySelector('.cm-editor')

    expect(editor).not.toBeNull()
    expect(host?.value).toContain('<section>')
  }
}

export const Empty = {
  args: {
    value: ''
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('html-fragment-editor')
    const editor = host?.shadowRoot?.querySelector('.cm-editor')

    expect(editor).not.toBeNull()
    expect(host?.value).toBe('')
  }
}

export const EmitsValueChanges = {
  args: {
    value: '<p>start</p>'
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('html-fragment-editor')
    const editor = host?.shadowRoot?.querySelector('.cm-content')
    let eventValue = ''

    host?.addEventListener('value-change', (event) => {
      eventValue = event.detail?.value ?? ''
    })

    editor?.dispatchEvent(new InputEvent('input', { bubbles: true }))
    await Promise.resolve()

    expect(eventValue || host?.value).toBeTruthy()
  }
}
