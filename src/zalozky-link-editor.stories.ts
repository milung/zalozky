import './zalozky-link-editor'

const buildEditor = (args = {}) => {
  const element = document.createElement('zalozky-link-editor')
  Object.assign(element, {
    isOpen: true,
    mode: 'create',
    bookmark: {
      title: 'Docs',
      url: 'https://example.com/docs',
      description: 'Docs description',
      icon: 'https://example.com/favicon.ico',
      tags: ['docs'],
      background: '#ecfeff',
      borderColor: '#06b6d4',
      foregroundColor: '#111827',
      isSearch: false
    },
    allTags: ['docs', 'web', 'dev'],
    formTagInput: '',
    formError: '',
    ...args
  })
  return element
}

export default {
  title: 'Components/Zalozky Link Editor',
  component: 'zalozky-link-editor',
  render: (args) => buildEditor(args)
}

export const CreateMode = {
  args: {
    mode: 'create',
    bookmark: { title: '', url: '', description: '', tags: [], isSearch: false }
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('zalozky-link-editor')
    const form = host?.shadowRoot?.querySelector('.bookmark-form')
    const urlInput = host?.shadowRoot?.querySelector('input[type="text"]')

    expect(form).not.toBeNull()
    expect(urlInput).not.toBeNull()
  }
}

export const SearchMode = {
  args: {
    bookmark: { title: 'Search docs', url: 'https://example.com/search?q=%s', tags: ['search'], isSearch: true }
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('zalozky-link-editor')
    const checkbox = host?.shadowRoot?.querySelector('input[type="checkbox"]')
    const note = host?.shadowRoot?.querySelector('.search-note')

    expect(checkbox?.checked).toBe(true)
    expect(note).not.toBeNull()
  }
}

export const ValidationError = {
  args: {
    mode: 'create',
    bookmark: { title: '', url: '', description: '', tags: [], isSearch: false }
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('zalozky-link-editor')
    const form = host?.shadowRoot?.querySelector('.bookmark-form')

    form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    expect(host?.formError).toBeTruthy()
  }
}
