import './zalozky-widget-editor'

const buildEditor = (args = {}) => {
  const element = document.createElement('zalozky-widget-editor')
  Object.assign(element, {
    isOpen: true,
    mode: 'create',
    widget: {
      title: 'Quick stats',
      url: 'https://example.com/stats',
      html: '<div>Metric</div>',
      tags: ['stats'],
      background: '#ecfeff',
      borderColor: '#06b6d4',
      foregroundColor: '#111827'
    },
    allTags: ['stats', 'dashboard', 'web'],
    formTagInput: '',
    formError: '',
    ...args
  })
  return element
}

export default {
  title: 'Components/Zalozky Widget Editor',
  component: 'zalozky-widget-editor',
  render: (args) => buildEditor(args)
}

export const CreateMode = {
  args: {
    mode: 'create',
    widget: { title: '', url: '', html: '', tags: [] }
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('zalozky-widget-editor')
    const form = host?.shadowRoot?.querySelector('.widget-form')
    const titleInput = host?.shadowRoot?.querySelector('input[type="text"]')

    expect(form).not.toBeNull()
    expect(titleInput).not.toBeNull()
  }
}

export const EditMode = {
  args: {
    mode: 'edit',
    widget: { title: 'Quick stats', url: 'https://example.com/stats', html: '<p>Updated</p>', tags: ['stats'] }
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('zalozky-widget-editor')
    const heading = host?.shadowRoot?.querySelector('.dialog-header h2')?.textContent ?? ''

    expect(heading.toLowerCase()).toContain('widget')
    expect(host?.form?.title).toBe('Quick stats')
  }
}

export const ValidationError = {
  args: {
    mode: 'create',
    widget: { title: '', url: '', html: '', tags: [] }
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('zalozky-widget-editor')
    const form = host?.shadowRoot?.querySelector('.widget-form')

    form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    expect(host?.formError).toBeTruthy()
  }
}
